# WhisperBox — End-to-End Encrypted Messaging

A secure messaging app where the server **never sees your messages**. All encryption and decryption happens on your device using the Web Crypto API.

---

## Architecture

```
┌─────────────────────────────────────────┐
│              Browser (Client)           │
│                                         │
│  ┌──────────────┐   ┌────────────────┐  │
│  │  React / UI  │   │  Web Crypto API│  │
│  └──────┬───────┘   └───────┬────────┘  │
│         │                   │           │
│  ┌──────▼───────────────────▼────────┐  │
│  │            Key Store              │  │
│  │  (IndexedDB — wrapped private key)│  │
│  └──────────────────────────────────┘  │
│         │  Only ciphertext              │
│         │  crosses the wire             │
└─────────┼─────────────────────────────-┘
          │ HTTPS / WSS
┌─────────▼─────────────────────────────-┐
│         WhisperBox API Server           │
│                                         │
│  • Stores encrypted blobs only          │
│  • Manages user identities & public keys│
│  • JWT authentication (access + refresh)│
│  • WebSocket for real-time delivery     │
│                                         │
│  ✗ Never sees plaintext messages        │
│  ✗ Never sees private keys              │
└────────────────────────────────────────-┘
```

---

## Encryption Flow

### Sending a message

```
Plaintext message
       │
       ▼
[1] Generate random AES-GCM-256 session key + 96-bit IV
       │
       ▼
[2] Encrypt plaintext → ciphertext  (AES-GCM)
       │
       ├──── [3a] Encrypt AES key with recipient's RSA-OAEP public key
       │                → encryptedKey  (only recipient can decrypt)
       │
       └──── [3b] Encrypt AES key with sender's own RSA-OAEP public key
                        → encryptedKeyForSelf  (sender can re-read sent msgs)

Payload sent to server:
{
  ciphertext,        // AES-GCM encrypted message
  iv,                // 96-bit random IV
  encryptedKey,      // AES key encrypted for recipient
  encryptedKeyForSelf// AES key encrypted for sender
}
```

### Receiving a message

```
Server delivers payload (ciphertext + encryptedKey + iv)
       │
       ▼
[1] Decrypt encryptedKey with own RSA-OAEP private key → raw AES key
       │
       ▼
[2] Import raw AES key as AES-GCM-256 CryptoKey
       │
       ▼
[3] Decrypt ciphertext with AES key + IV → plaintext
```

---

## Key Management

### Key types

| Key | Algorithm | Where stored | Who can access |
|-----|-----------|--------------|---------------|
| RSA-OAEP keypair | 2048-bit | Generated once in browser | Client only |
| Public key | RSA-OAEP | Server (SPKI base64) | Everyone |
| Private key (wrapped) | AES-GCM-256 | Server + IndexedDB | Owner only (needs password) |
| Wrapping key | AES-GCM-256 from PBKDF2 | Never stored | Derived fresh from password |

### Private key lifecycle

```
Registration:
  password ──PBKDF2 (310,000 iter, SHA-256)──► wrapping key (AES-GCM)
  private key ──exportKey("pkcs8")──► raw PKCS8 bytes
  [IV ‖ AES-GCM(raw PKCS8, wrappingKey)] ──base64──► wrappedPrivateKey
                                                      (safe to store on server)

Login / Unlock:
  password ──PBKDF2──► wrapping key
  wrappedPrivateKey ──AES-GCM decrypt──► raw PKCS8 bytes
  PKCS8 bytes ──importKey──► CryptoKey (lives in memory only, never persisted)
```

- **Private keys never leave the client as plaintext** — only the AES-GCM-wrapped PKCS8 blob is stored on the server.
- **IndexedDB** stores only session metadata (user ID, username, public key, wrapped private key) — no raw key material.
- **sessionStorage** holds short-lived JWT tokens (cleared on tab close).

---

## Technology Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Encryption | Web Crypto API (native browser) |
| Symmetric | AES-GCM 256-bit |
| Asymmetric | RSA-OAEP 2048-bit |
| Key derivation | PBKDF2, SHA-256, 310,000 iterations |
| Real-time | WebSocket |
| Key persistence | IndexedDB |
| Auth tokens | JWT (sessionStorage) |
| Styling | CSS custom properties, Signal-inspired dark theme |

---

## Security Trade-offs

| Decision | Trade-off |
|----------|-----------|
| RSA-OAEP (2048-bit) instead of ECDH | Simpler key exchange model; ECDH would offer forward secrecy per-message |
| `wrapKey` as AES-GCM encrypt of PKCS8 | Avoids AES-KW alignment requirement; authenticated encryption adds integrity |
| PBKDF2 at 310k iterations | Balances usability (< 1s on modern hardware) vs brute-force resistance |
| Wrapped private key stored server-side | Enables login from any device but key is only as secure as the password |
| sessionStorage for JWTs | Cleared on tab close (less persistent than localStorage) |
| No server-side message deletion | Messages persist as ciphertext; deletion is a future feature |

---

## Known Limitations

- **Password recovery is impossible** — if you forget your password, your private key cannot be recovered. There is no reset flow.
- **No forward secrecy per message** — the same RSA keypair is used for all messages. Compromise of the private key exposes all past messages.
- **No device sync** — each device requires re-authentication (re-entering password) to unwrap the private key into memory.
- **No message deletion** — once sent, ciphertext remains on the server.
- **RSA-OAEP plaintext limit** — RSA-OAEP with 2048-bit keys can only encrypt up to ~190 bytes. We use it only to encrypt the 32-byte AES session key, so this is not a practical limit.
- **No group messaging** — only 1-to-1 encrypted conversations are supported.

---

## Security Checklist

- [x] No plaintext in localStorage or any server-side storage
- [x] HTTPS enforced (Koyeb deployment)
- [x] Input validation on all forms
- [x] Decryption failures shown gracefully (not silently ignored)
- [x] Private key never sent over the wire unencrypted
- [x] JWT tokens in sessionStorage (not localStorage)
- [x] AES-GCM authenticated encryption (tamper detection)
- [x] PBKDF2 key derivation with high iteration count
- [ ] Forward secrecy (future: ECDH ephemeral keys)
- [ ] Replay attack prevention (future: message nonces + timestamps)

---

## API

Base URL: `https://whisperbox.koyeb.app/`  
Docs: `https://whisperbox.koyeb.app/docs`

All message payloads sent to the API contain only encrypted blobs. The server has no capability to read message content.
