"use client";

import { useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ChatSidebar from "@/components/ChatSidebar";

export default function ChatLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, isLocked, privateKey } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isInConversation =
    typeof pathname === "string" &&
    pathname !== "/chat" &&
    pathname.startsWith("/chat/");

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/auth/login");
    } else if (isLocked || !privateKey) {
      router.replace("/auth/unlock");
    }
  }, [user, isLoading, isLocked, privateKey, router]);

  if (isLoading || !user || !privateKey) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--border)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .chat-shell {
          height: 100vh;
          height: 100dvh;
          display: flex;
          background: var(--bg);
          overflow: hidden;
        }
        .chat-sidebar-slot {
          width: 300px;
          min-width: 300px;
          flex-shrink: 0;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .chat-main-slot {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .chat-sidebar-slot {
            width: 100%;
            min-width: 0;
            border-right: none;
            /* show sidebar when NOT in a conversation */
            display: ${isInConversation ? "none" : "flex"};
          }
          .chat-main-slot {
            width: 100%;
            /* show main only when in a conversation */
            display: ${isInConversation ? "flex" : "none"};
          }
        }
      `}</style>
      <div className="chat-shell">
        <div className="chat-sidebar-slot">
          <ChatSidebar />
        </div>
        <div className="chat-main-slot">{children}</div>
      </div>
    </>
  );
}
