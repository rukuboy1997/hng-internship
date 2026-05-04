"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/api";
import * as crypto from "@/lib/crypto";
import * as keyStore from "@/lib/keyStore";
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound } from "lucide-react";

export default function RegisterPage() {
  const { setUser } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "generating">("form");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setStep("generating");

    try {
      // 1. Generate RSA-OAEP keypair
      const keyPair = await crypto.generateKeyPair();

      // 2. Generate PBKDF2 salt
      const pbkdf2Salt = await crypto.generateSalt();

      // 3. Derive AES-KW wrapping key from password
      const wrappingKey = await crypto.deriveWrappingKey(password, pbkdf2Salt);

      // 4. Wrap private key (safe to send to server)
      const wrappedPrivateKey = await crypto.wrapPrivateKey(
        keyPair.privateKey,
        wrappingKey
      );

      // 5. Export public key to send to server
      const publicKey = await crypto.exportPublicKey(keyPair.publicKey);

      // 6. Register
      const res = await api.register({
        username: username.trim(),
        display_name: displayName.trim(),
        password,
        public_key: publicKey,
        wrapped_private_key: wrappedPrivateKey,
        pbkdf2_salt: pbkdf2Salt,
      });

      api.storeTokens(res.access_token, res.refresh_token);

      await keyStore.saveSession({
        userId: res.user.id,
        username: res.user.username,
        displayName: res.user.display_name,
        publicKey: res.user.public_key,
        wrappedPrivateKey: res.user.wrapped_private_key,
        pbkdf2Salt: res.user.pbkdf2_salt,
      });

      setUser(
        {
          id: res.user.id,
          username: res.user.username,
          displayName: res.user.display_name,
          publicKey: res.user.public_key,
          wrappedPrivateKey: res.user.wrapped_private_key,
          pbkdf2Salt: res.user.pbkdf2_salt,
        },
        keyPair.privateKey
      );

      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setStep("form");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          padding: 24px;
        }
        .auth-card {
          width: 100%;
          max-width: 440px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 40px 36px;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 28px;
        }
        .auth-logo-icon {
          width: 40px;
          height: 40px;
          background: var(--accent);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .auth-logo-text { font-size: 20px; font-weight: 700; color: var(--text); }
        .auth-logo-sub { font-size: 12px; color: var(--green); font-weight: 500; margin-top: 1px; }
        .auth-title { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .auth-subtitle { font-size: 14px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.5; }
        .field { margin-bottom: 14px; }
        .field label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .input-wrap { position: relative; }
        .field input {
          width: 100%;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text);
          font-size: 14px;
          transition: border-color 0.15s;
        }
        .field input:focus { outline: none; border-color: var(--accent); }
        .field input::placeholder { color: var(--text-muted); opacity: 0.5; }
        .pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 2px;
          display: flex;
        }
        .pw-toggle:hover { color: var(--text); }
        .btn-primary {
          width: 100%;
          background: var(--accent);
          color: #000;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
          transition: opacity 0.15s;
        }
        .btn-primary:hover:not(:disabled) { opacity: 0.85; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-error {
          background: rgba(248, 81, 73, 0.1);
          border: 1px solid rgba(248, 81, 73, 0.3);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: var(--danger);
          margin-bottom: 14px;
        }
        .auth-link { text-align: center; margin-top: 24px; font-size: 13px; color: var(--text-muted); }
        .auth-link a { color: var(--accent); text-decoration: none; font-weight: 500; }
        .auth-link a:hover { text-decoration: underline; }
        .key-note {
          background: rgba(88, 166, 255, 0.08);
          border: 1px solid rgba(88, 166, 255, 0.2);
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 12px;
          color: var(--accent);
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .key-note-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .generating-state {
          text-align: center;
          padding: 20px 0;
        }
        .generating-spinner {
          width: 44px;
          height: 44px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        .generating-title { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
        .generating-sub { font-size: 13px; color: var(--text-muted); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Lock size={18} color="#000" />
          </div>
          <div>
            <div className="auth-logo-text">WhisperBox</div>
            <div className="auth-logo-sub">End-to-End Encrypted</div>
          </div>
        </div>

        {step === "generating" ? (
          <div className="generating-state">
            <div className="generating-spinner" />
            <div className="generating-title">Generating your keys…</div>
            <div className="generating-sub">
              Creating your RSA-OAEP keypair and securing your private key with
              your password. This only happens once.
            </div>
          </div>
        ) : (
          <>
            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">
              A unique RSA keypair will be generated for you. Your private key
              is encrypted with your password and never leaves your device.
            </p>

            <div className="key-note">
              <div className="key-note-header">
                <KeyRound size={13} />
                Remember your password
              </div>
              Your password encrypts your private key. If you forget it, you
              cannot recover your messages — we have no way to help.
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="alice_92"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  minLength={3}
                  maxLength={32}
                  required
                />
              </div>

              <div className="field">
                <label>Display name</label>
                <input
                  type="text"
                  placeholder="Alice"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={128}
                  required
                />
              </div>

              <div className="field">
                <label>Password</label>
                <div className="input-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    style={{ paddingRight: 40 }}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="field">
                <label>Confirm password</label>
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create account & generate keys"}
              </button>
            </form>

            <div className="auth-link">
              Already have an account?{" "}
              <Link href="/auth/login">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
