"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getWebSocketUrl, MessageResponse } from "@/lib/api";

type WSMessage =
  | { type: "message.receive"; data: MessageResponse }
  | { type: "connected" }
  | { type: "error"; message: string };

interface UseWebSocketOptions {
  onMessage?: (msg: MessageResponse) => void;
  enabled?: boolean;
}

export function useWebSocket({ onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return;

    const url = getWebSocketUrl();
    if (!url.includes("token=")) return; // no token yet

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const msg: WSMessage = JSON.parse(event.data as string);
          if (msg.type === "message.receive") {
            onMessageRef.current?.(msg.data);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        wsRef.current = null;
        // Reconnect after 3s
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // ignore
    }
  }, [enabled]);

  const send = useCallback((type: string, data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...( data as object) }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect, enabled]);

  return { connected, send };
}
