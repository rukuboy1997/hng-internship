"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
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
          max-width: 400px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 40px 36px;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
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
        .auth-logo-text {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
        }
        .auth-logo-sub {
          font-size: 12px;
          color: var(--green);
          font-weight: 500;
          margin-top: 1px;
        }
        .auth-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 6px;
        }
        .auth-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 28px;
          line-height: 1.5;
        }
        .field {
          margin-bottom: 16px;
        }
        .field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .input-wrap {
          position: relative;
        }
        .field input {
          width: 100%;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 11px 14px;
          color: var(--text);
          font-size: 14px;
          transition: border-color 0.15s;
        }
        .field input:focus {
          outline: none;
          border-color: var(--accent);
        }
        .field input::placeholder {
          color: var(--text-muted);
          opacity: 0.5;
        }
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
          margin-bottom: 16px;
        }
        .auth-link {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: var(--text-muted);
        }
        .auth-link a {
          color: var(--accent);
          text-decoration: none;
          font-weight: 500;
        }
        .auth-link a:hover { text-decoration: underline; }
        .e2ee-note {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(63, 185, 80, 0.08);
          border: 1px solid rgba(63, 185, 80, 0.2);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 12px;
          color: var(--green);
          margin-bottom: 24px;
        }
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

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">
          Sign in to your encrypted account. Your private key will be unlocked
          from your password — it never leaves your device.
        </p>

        <div className="e2ee-note">
          <ShieldCheck size={14} />
          <span>
            Your messages are encrypted before reaching our servers. We
            cannot read them.
          </span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Username</label>
            <input
              type="text"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <div className="input-wrap">
              <input
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
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

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Unlocking keys…" : "Sign in"}
          </button>
        </form>

        <div className="auth-link">
          New to WhisperBox?{" "}
          <Link href="/auth/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
