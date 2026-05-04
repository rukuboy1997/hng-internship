// Web Crypto API utilities for E2EE
// All operations happen in the browser — private keys NEVER leave the client

export const b64 = {
  encode: (buf: ArrayBuffer): string => {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },
  decode: (str: string): ArrayBuffer =>
    Uint8Array.from(atob(str), (c) => c.charCodeAt(0)).buffer,
};

/** Generate an RSA-OAEP keypair for asymmetric key wrapping */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/** Generate a random 128-bit PBKDF2 salt */
export async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return b64.encode(salt.buffer as ArrayBuffer);
}

/**
 * Derive an AES-GCM wrapping key from a password + salt via PBKDF2.
 * AES-GCM is used instead of AES-KW because AES-KW requires the plaintext
 * to be a multiple of 8 bytes — PKCS8 RSA keys are not guaranteed to be.
 */
export async function deriveWrappingKey(
  password: string,
  saltB64: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: b64.decode(saltB64),
      iterations: 310_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Wrap the private key with AES-GCM.
 * Layout: [12 bytes IV] + [ciphertext]
 * Safe to store on the server — only decryptable with the correct password.
 */
export async function wrapPrivateKey(
  privateKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<string> {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    pkcs8
  );
  const result = new Uint8Array(12 + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), 12);
  return b64.encode(result.buffer as ArrayBuffer);
}

/**
 * Unwrap the private key — decrypts it in memory from the password-derived key.
 * Reconstructs the CryptoKey but never exposes raw key bytes.
 */
export async function unwrapPrivateKey(
  wrappedB64: string,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  const data = new Uint8Array(b64.decode(wrappedB64));
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const pkcs8 = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    ciphertext
  );
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

/** Export a public key to base64 SPKI format (safe to share) */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  return b64.encode(exported);
}

/** Import a base64 SPKI public key for encryption */
export async function importPublicKey(b64Str: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    b64.decode(b64Str),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  encryptedKey: string;
  encryptedKeyForSelf: string;
}

/**
 * Encrypt a plaintext message.
 * 1. Generate a random AES-GCM key
 * 2. Encrypt plaintext with AES-GCM
 * 3. Encrypt the AES key with recipient's RSA public key
 * 4. Encrypt the AES key again with sender's own RSA public key (to read sent msgs)
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: CryptoKey,
  senderPublicKey: CryptoKey
): Promise<EncryptedPayload> {
  const enc = new TextEncoder();

  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    enc.encode(plaintext)
  );

  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);

  const encryptedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    rawAesKey
  );

  const encryptedKeyForSelf = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    senderPublicKey,
    rawAesKey
  );

  return {
    ciphertext: b64.encode(ciphertext),
    iv: b64.encode(iv.buffer as ArrayBuffer),
    encryptedKey: b64.encode(encryptedKey),
    encryptedKeyForSelf: b64.encode(encryptedKeyForSelf),
  };
}

/**
 * Decrypt a message.
 * - If sent BY me: decrypt encryptedKeyForSelf with my private key
 * - If sent TO me: decrypt encryptedKey with my private key
 */
export async function decryptMessage(
  payload: EncryptedPayload,
  privateKey: CryptoKey,
  isSentByMe: boolean
): Promise<string> {
  const keyBlob = isSentByMe ? payload.encryptedKeyForSelf : payload.encryptedKey;

  const rawAesKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    b64.decode(keyBlob)
  );

  const aesKey = await crypto.subtle.importKey(
    "raw",
    rawAesKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64.decode(payload.iv) },
    aesKey,
    b64.decode(payload.ciphertext)
  );

  return new TextDecoder().decode(plaintext);
}
