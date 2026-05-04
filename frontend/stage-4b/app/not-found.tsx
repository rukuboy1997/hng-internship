"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        gap: 16,
        padding: 24,
      }}
    >
      <div style={{ fontSize: 64, fontWeight: 800, color: "var(--border)" }}>
        404
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
        Page not found
      </div>
      <Link
        href="/"
        style={{
          color: "var(--accent)",
          textDecoration: "none",
          fontSize: 14,
        }}
      >
        Go home
      </Link>
    </div>
  );
}
