"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/api";
import {
  Lock,
  Search,
  LogOut,
  MessageSquare,
  X,
  UserPlus,
  ShieldCheck,
} from "lucide-react";

export default function ChatSidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<api.ConversationSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<api.UserPublicInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await api.getConversations();
      setConversations(convs);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 15_000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchUsers(searchQuery.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openConversation = (userId: string) => {
    router.push(`/chat/${userId}`);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    loadConversations();
  };

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

  const currentUserId = pathname?.split("/chat/")[1]?.split("/")[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <style>{`
        /* ── Sidebar header ── */
        .sb-header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 60px;
          flex-shrink: 0;
        }
        .sb-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
        .sb-logo-icon {
          width: 32px;
          height: 32px;
          background: var(--accent);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sb-logo-text {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
        }
        .sb-logo-sub {
          font-size: 10px;
          color: var(--green);
          font-weight: 500;
          white-space: nowrap;
          margin-top: 1px;
        }

        /* ── Icon button ── */
        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          min-width: 36px;
          min-height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .icon-btn:hover { background: var(--surface-2); color: var(--text); }
        .icon-btn.danger:hover { color: var(--danger); }

        /* ── Search bar ── */
        .sb-search {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .sb-search-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 0 14px;
          transition: border-color 0.15s;
        }
        .sb-search-wrap:focus-within { border-color: var(--accent); }
        .sb-search-input {
          flex: 1;
          background: none;
          border: none;
          color: var(--text);
          font-size: 14px;
          padding: 9px 0;
          outline: none;
          min-width: 0;
        }
        .sb-search-input::placeholder { color: var(--text-muted); opacity: 0.55; }
        .search-clear {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 4px;
          display: flex;
          align-items: center;
          min-width: 20px;
        }
        .search-clear:hover { color: var(--text); }

        /* ── Conversation list ── */
        .conv-list {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* section label */
        .list-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 12px 16px 4px;
        }

        /* conversation row */
        .conv-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.1s;
          border-left: 3px solid transparent;
          min-height: 64px;
        }
        .conv-item:hover { background: var(--surface-2); }
        .conv-item.active {
          background: rgba(88, 166, 255, 0.07);
          border-left-color: var(--accent);
        }
        .conv-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          font-weight: 700;
          color: #000;
          flex-shrink: 0;
        }
        .conv-info { flex: 1; min-width: 0; }
        .conv-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .conv-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }
        .conv-sub {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }

        /* user search result row */
        .user-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 16px;
          cursor: pointer;
          transition: background 0.1s;
          min-height: 58px;
        }
        .user-item:hover { background: var(--surface-2); }
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--surface-2);
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .user-info { flex: 1; min-width: 0; }
        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-handle {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 1px;
        }

        /* states */
        .state-msg {
          padding: 24px 16px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }
        .empty-convs {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 40px 20px;
          color: var(--text-muted);
          text-align: center;
        }
        .empty-convs-title { font-size: 13px; font-weight: 600; color: var(--text); }
        .empty-convs-sub { font-size: 12px; line-height: 1.5; }

        /* ── Footer / profile ── */
        .sb-footer {
          padding: 12px 16px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
        }
        .my-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--surface-2);
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          flex-shrink: 0;
        }
        .my-info { flex: 1; min-width: 0; }
        .my-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .my-handle { font-size: 11px; color: var(--text-muted); }

        /* e2ee note in footer */
        .e2ee-note {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: var(--green);
          font-weight: 500;
          margin-top: 1px;
        }

        /* Mobile: bump touch targets */
        @media (max-width: 640px) {
          .conv-item { min-height: 68px; padding: 14px 16px; }
          .user-item  { min-height: 62px; }
          .sb-search-input { font-size: 16px; } /* prevent iOS zoom */
        }
      `}</style>

      {/* ── Header ── */}
      <div className="sb-header">
        <div className="sb-logo">
          <div className="sb-logo-icon">
            <Lock size={15} color="#000" />
          </div>
          <div>
            <div className="sb-logo-text">WhisperBox</div>
            <div className="sb-logo-sub">End-to-End Encrypted</div>
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={() => {
            setShowSearch((v) => !v);
            setSearchQuery("");
            setSearchResults([]);
          }}
          title={showSearch ? "Close search" : "New chat"}
          style={showSearch ? { color: "var(--accent)" } : undefined}
        >
          {showSearch ? <X size={18} /> : <UserPlus size={18} />}
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className="sb-search">
        <div className="sb-search-wrap">
          <Search size={14} color="var(--text-muted)" />
          <input
            className="sb-search-input"
            type="search"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder={showSearch ? "Search users to message…" : "Search conversations…"}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!showSearch) setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── List ── */}
      <div className="conv-list">
        {showSearch && searchQuery ? (
          /* ── User search results ── */
          <>
            <div className="list-label">People</div>
            {searching ? (
              <div className="state-msg">Searching…</div>
            ) : searchResults.length === 0 ? (
              <div className="state-msg">No users found</div>
            ) : (
              searchResults.map((u) => (
                <div
                  key={u.id}
                  className="user-item"
                  onClick={() => openConversation(u.id)}
                >
                  <div className="user-avatar">
                    {u.display_name[0]?.toUpperCase()}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{u.display_name}</div>
                    <div className="user-handle">@{u.username}</div>
                  </div>
                  <MessageSquare size={15} color="var(--text-muted)" />
                </div>
              ))
            )}
          </>
        ) : (
          /* ── Conversations ── */
          <>
            {conversations.length === 0 ? (
              <div className="empty-convs">
                <MessageSquare size={30} color="var(--border)" />
                <div className="empty-convs-title">No conversations yet</div>
                <div className="empty-convs-sub">
                  Tap the{" "}
                  <UserPlus
                    size={12}
                    style={{ display: "inline", verticalAlign: "middle" }}
                  />{" "}
                  icon above or search for someone to start a secure chat.
                </div>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = currentUserId === conv.user_id;
                const timeStr = conv.last_message_at
                  ? new Date(conv.last_message_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })
                  : "";
                return (
                  <div
                    key={conv.user_id}
                    className={`conv-item ${isActive ? "active" : ""}`}
                    onClick={() => openConversation(conv.user_id)}
                  >
                    <div className="conv-avatar">
                      {conv.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="conv-info">
                      <div className="conv-name">{conv.display_name}</div>
                      <div className="conv-meta">
                        <Lock size={10} color="var(--green)" />
                        <span className="conv-sub">
                          @{conv.username}
                          {timeStr && ` · ${timeStr}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* ── Footer / profile ── */}
      <div className="sb-footer">
        <div className="my-avatar">
          {user?.displayName[0]?.toUpperCase()}
        </div>
        <div className="my-info">
          <div className="my-name">{user?.displayName}</div>
          <div className="e2ee-note">
            <ShieldCheck size={9} />
            encrypted · @{user?.username}
          </div>
        </div>
        <button
          className="icon-btn danger"
          onClick={handleLogout}
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
