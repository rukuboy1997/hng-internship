"use client";

import { Lock, ShieldCheck, UserPlus } from "lucide-react";

export default function ChatEmpty() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "var(--bg)",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <style>{`
        .empty-ring {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: var(--surface);
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .empty-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
        }
        .empty-sub {
          font-size: 14px;
          color: var(--text-muted);
          max-width: 300px;
          line-height: 1.6;
        }
        .e2ee-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(63, 185, 80, 0.08);
          border: 1px solid rgba(63, 185, 80, 0.2);
          border-radius: 20px;
          padding: 6px 16px;
          font-size: 12px;
          color: var(--green);
          font-weight: 500;
        }
        .tip {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-muted);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 16px;
        }
      `}</style>

      <div className="empty-ring">
        <Lock size={36} color="var(--accent)" />
      </div>

      <div className="empty-title">Your messages are private</div>

      <div className="empty-sub">
        Select a conversation from the sidebar, or click the{" "}
        <UserPlus
          size={13}
          style={{ display: "inline", verticalAlign: "middle" }}
        />{" "}
        icon to find someone and start a secure chat.
      </div>

      <div className="e2ee-badge">
        <ShieldCheck size={13} />
        AES-GCM + RSA-OAEP end-to-end encryption
      </div>

      <div className="tip">
        <Lock size={12} color="var(--accent)" />
        The server never sees your messages — only ciphertext is stored.
      </div>
    </div>
  );
}
