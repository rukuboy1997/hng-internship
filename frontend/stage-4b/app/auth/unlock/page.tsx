"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function UnlockPage() {
  const { user, unlock, logout } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await unlock(password);
      router.push("/chat");
    } catch {
      setError("Incorrect password — could not unlock your keys");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    if (typeof window !== "undefined") router.replace("/auth/login");
    return null;
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: 24,
    }}>
      <style>{`
        .unlock-card {
          width: 100%;
          max-width: 380px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 40px 32px;
          text-align: center;
        }
        .lock-icon-wrap {
          width: 64px;
          height: 64px;
          background: var(--surface-2);
          border: 2px solid var(--border);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        .unlock-title { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
        .unlock-sub { font-size: 14px; color: var(--text-muted); margin-bottom: 28px; line-height: 1.5; }
        .field { margin-bottom: 14px; text-align: left; }
        .input-wrap { position: relative; }
        .field input {
          width: 100%;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 42px 10px 14px;
          color: var(--text);
          font-size: 14px;
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
          transition: opacity 0.15s;
        }
        .btn-primary:hover:not(:disabled) { opacity: 0.85; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 13px;
          cursor: pointer;
          margin-top: 16px;
        }
        .btn-ghost:hover { color: var(--danger); }
        .unlock-error {
          background: rgba(248, 81, 73, 0.1);
          border: 1px solid rgba(248, 81, 73, 0.3);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: var(--danger);
          margin-bottom: 14px;
          text-align: left;
        }
      `}</style>

      <div className="unlock-card">
        <div className="lock-icon-wrap">
          <Lock size={28} color="var(--text-muted)" />
        </div>
        <div className="unlock-title">Session locked</div>
        <div className="unlock-sub">
          Welcome back, <strong>{user.displayName}</strong>. Enter your
          password to unlock your encryption keys.
        </div>

        {error && <div className="unlock-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <div className="input-wrap">
              <input
                type={showPw ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
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
            {loading ? "Unlocking…" : "Unlock"}
          </button>
        </form>

        <button
          className="btn-ghost"
          onClick={async () => {
            await logout();
            router.push("/auth/login");
          }}
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
