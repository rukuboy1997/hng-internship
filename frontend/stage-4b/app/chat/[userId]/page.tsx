"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { use } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import * as api from "@/lib/api";
import {
  decryptMessage,
  encryptMessage,
  importPublicKey,
} from "@/lib/crypto";
import {
  Lock,
  Send,
  ShieldCheck,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

interface DecryptedMessage {
  id: string;
  fromUserId: string;
  text: string | null;
  decryptError?: boolean;
  createdAt: string;
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { user, privateKey } = useAuth();
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [partnerName, setPartnerName] = useState("");
  const [partnerHandle, setPartnerHandle] = useState("");
  const [partnerPublicKey, setPartnerPublicKey] = useState<CryptoKey | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const decryptMsg = useCallback(
    async (msg: api.MessageResponse): Promise<DecryptedMessage> => {
      if (!privateKey || !user) {
        return {
          id: msg.id,
          fromUserId: msg.from_user_id,
          text: null,
          decryptError: true,
          createdAt: msg.created_at,
        };
      }
      try {
        const isSentByMe = msg.from_user_id === user.id;
        const text = await decryptMessage(msg.payload, privateKey, isSentByMe);
        return { id: msg.id, fromUserId: msg.from_user_id, text, createdAt: msg.created_at };
      } catch {
        return {
          id: msg.id,
          fromUserId: msg.from_user_id,
          text: null,
          decryptError: true,
          createdAt: msg.created_at,
        };
      }
    },
    [privateKey, user]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [msgs, pkB64] = await Promise.all([
          api.getMessages(userId),
          api.getUserPublicKey(userId),
        ]);
        if (cancelled) return;

        const importedKey = await importPublicKey(pkB64);
        setPartnerPublicKey(importedKey);

        const decrypted = await Promise.all(msgs.reverse().map(decryptMsg));
        if (!cancelled) {
          setMessages(decrypted);
          try {
            const convs = await api.getConversations();
            const conv = convs.find((c) => c.user_id === userId);
            if (conv && !cancelled) {
              setPartnerName(conv.display_name);
              setPartnerHandle(conv.username);
            }
          } catch { /* ignore */ }
        }
      } catch (err: unknown) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [userId, decryptMsg]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleIncoming = useCallback(
    async (msg: api.MessageResponse) => {
      if (msg.from_user_id !== userId && msg.to_user_id !== userId) return;
      const decrypted = await decryptMsg(msg);
      setMessages((prev) => {
        if (prev.some((m) => m.id === decrypted.id)) return prev;
        return [...prev, decrypted];
      });
    },
    [userId, decryptMsg]
  );

  const { connected } = useWebSocket({
    onMessage: handleIncoming,
    enabled: !!privateKey,
  });

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !partnerPublicKey || !user || !privateKey) return;
    setSending(true);
    setInput("");
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    try {
      const selfPublicKey = await importPublicKey(user.publicKey);
      const payload = await encryptMessage(text, partnerPublicKey, selfPublicKey);
      const sent = await api.sendMessage(userId, payload);
      setMessages((prev) => [
        ...prev,
        { id: sent.id, fromUserId: user.id, text, createdAt: sent.created_at },
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send");
      setInput(text);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const initials = (partnerName || userId)[0]?.toUpperCase() || "?";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <style>{`
        /* ── Header ── */
        .conv-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          min-height: 60px;
          flex-shrink: 0;
        }
        .back-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          min-height: 36px;
          flex-shrink: 0;
          transition: background 0.15s;
          text-decoration: none;
        }
        .back-btn:hover { background: var(--surface-2); color: var(--text); }
        @media (max-width: 640px) { .back-btn { display: flex; } }

        .partner-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 700;
          color: #000;
          flex-shrink: 0;
        }
        .partner-info { flex: 1; min-width: 0; }
        .partner-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .e2ee-row {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }
        .ws-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--green);
        }
        .ws-dot.off { background: var(--border); }
        .e2ee-label {
          font-size: 11px;
          color: var(--green);
          font-weight: 500;
        }

        /* ── Error bar ── */
        .error-bar {
          background: rgba(248,81,73,0.1);
          border-top: 1px solid rgba(248,81,73,0.2);
          padding: 8px 16px;
          font-size: 12px;
          color: var(--danger);
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .dismiss-btn {
          margin-left: auto;
          background: none;
          border: none;
          color: var(--danger);
          cursor: pointer;
          font-size: 12px;
          padding: 2px 6px;
        }

        /* ── Messages ── */
        .messages-area {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* date divider */
        .date-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          color: var(--text-muted);
          font-size: 11px;
        }
        .date-divider::before,
        .date-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .msg-row { display: flex; }
        .msg-row.sent { justify-content: flex-end; }
        .msg-row.recv { justify-content: flex-start; }

        .msg-bubble {
          max-width: min(72%, 420px);
          padding: 10px 14px;
          border-radius: 18px;
          font-size: 14px;
          line-height: 1.5;
          word-break: break-word;
          position: relative;
        }
        .msg-bubble.sent {
          background: var(--sent-bg);
          color: var(--text);
          border-bottom-right-radius: 4px;
        }
        .msg-bubble.recv {
          background: var(--recv-bg);
          color: var(--text);
          border-bottom-left-radius: 4px;
          border: 1px solid var(--border);
        }
        .msg-bubble.err {
          background: rgba(248,81,73,0.08);
          border: 1px solid rgba(248,81,73,0.2);
          color: var(--danger);
          font-style: italic;
          font-size: 13px;
        }
        .msg-time {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 3px;
          display: block;
          opacity: 0.8;
        }
        .msg-row.sent .msg-time { text-align: right; }
        .msg-row.recv .msg-time { text-align: left; }

        /* skeletons */
        .skeleton-wrap { display: flex; flex-direction: column; gap: 10px; }
        .skeleton {
          height: 44px;
          background: var(--surface-2);
          border-radius: 14px;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .skeleton.s { margin-left: auto; width: 52%; }
        .skeleton.r { width: 44%; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }

        /* empty state */
        .empty-conv {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--text-muted);
          font-size: 14px;
          text-align: center;
          padding: 40px 24px;
        }
        .empty-conv-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
        }
        .e2ee-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(63,185,80,0.08);
          border: 1px solid rgba(63,185,80,0.2);
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 11px;
          color: var(--green);
          font-weight: 500;
        }

        /* ── Input area ── */
        .input-area {
          padding: 10px 14px;
          padding-bottom: max(10px, env(safe-area-inset-bottom));
          border-top: 1px solid var(--border);
          background: var(--surface);
          display: flex;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }
        .msg-input {
          flex: 1;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 22px;
          padding: 10px 16px;
          color: var(--text);
          font-size: 14px;
          resize: none;
          max-height: 120px;
          line-height: 1.5;
          transition: border-color 0.15s;
          font-family: inherit;
        }
        .msg-input:focus { outline: none; border-color: var(--accent); }
        .msg-input::placeholder { color: var(--text-muted); opacity: 0.5; }
        @media (max-width: 640px) {
          .msg-input { font-size: 16px; } /* prevent iOS zoom */
          .msg-bubble { max-width: min(80%, 420px); }
        }

        .send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--accent);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.15s, transform 0.1s;
        }
        .send-btn:hover:not(:disabled) { opacity: 0.85; transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>

      {/* ── Header ── */}
      <div className="conv-header">
        <Link href="/chat" className="back-btn" aria-label="Back">
          <ChevronLeft size={22} />
        </Link>
        <div className="partner-avatar">{initials}</div>
        <div className="partner-info">
          <div className="partner-name">
            {partnerName || userId.slice(0, 8) + "…"}
          </div>
          <div className="e2ee-row">
            <div className={`ws-dot ${connected ? "" : "off"}`} />
            <Lock size={9} color="var(--green)" />
            <span className="e2ee-label">
              {partnerHandle ? `@${partnerHandle} · ` : ""}End-to-end encrypted
            </span>
          </div>
        </div>
        <ShieldCheck size={18} color="var(--green)" />
      </div>

      {/* ── Error bar ── */}
      {error && (
        <div className="error-bar">
          <AlertCircle size={13} />
          {error}
          <button className="dismiss-btn" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="messages-area">
        {loading ? (
          <div className="skeleton-wrap">
            <div className="skeleton r" />
            <div className="skeleton s" />
            <div className="skeleton r" style={{ width: "58%" }} />
            <div className="skeleton s" style={{ width: "38%" }} />
            <div className="skeleton r" style={{ width: "50%" }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-conv">
            <div className="partner-avatar" style={{ width: 56, height: 56, fontSize: 22 }}>
              {initials}
            </div>
            <div className="empty-conv-name">{partnerName || "Unknown"}</div>
            {partnerHandle && (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                @{partnerHandle}
              </div>
            )}
            <div className="e2ee-pill">
              <Lock size={10} />
              End-to-end encrypted conversation
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Send the first message. Only you and {partnerName || "them"} can read it.
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.fromUserId === user?.id;
            const time = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            // Show date divider when day changes
            const prev = messages[i - 1];
            const thisDay = new Date(msg.createdAt).toDateString();
            const prevDay = prev ? new Date(prev.createdAt).toDateString() : null;
            const showDate = thisDay !== prevDay;
            const dateLabel = new Date(msg.createdAt).toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            });

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="date-divider">{dateLabel}</div>
                )}
                <div className={`msg-row ${isMine ? "sent" : "recv"}`}>
                  <div
                    className={`msg-bubble ${isMine ? "sent" : "recv"} ${
                      msg.decryptError ? "err" : ""
                    }`}
                  >
                    {msg.decryptError ? (
                      <>
                        <AlertCircle
                          size={12}
                          style={{ display: "inline", marginRight: 4 }}
                        />
                        Could not decrypt message
                      </>
                    ) : (
                      msg.text
                    )}
                    <span className="msg-time">{time}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="input-area">
        <textarea
          ref={textareaRef}
          className="msg-input"
          placeholder="Encrypted message…"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height =
              Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={!partnerPublicKey || sending}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim() || !partnerPublicKey || sending}
          aria-label="Send message"
        >
          <Send size={17} color="#000" />
        </button>
      </div>
    </div>
  );
}
