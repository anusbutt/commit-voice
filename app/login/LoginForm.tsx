"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, redirect: redirectTo }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push(data.redirect || "/dashboard");
        router.refresh();
      } else {
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0a0a",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        background: "#161616",
        border: "1px solid #333",
        borderRadius: "12px",
        padding: "40px",
        width: "100%",
        maxWidth: "400px",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎙️</div>
          <h1 style={{
            color: "#ededed",
            fontSize: "24px",
            fontWeight: 600,
            margin: "0 0 8px 0",
          }}>
            Commit Voice
          </h1>
          <p style={{
            color: "#888",
            fontSize: "14px",
            margin: 0,
          }}>
            Enter your dashboard password
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "#0a0a0a",
                border: "1px solid #333",
                borderRadius: "8px",
                color: "#ededed",
                fontSize: "16px",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {error && (
            <div style={{
              color: "#ef4444",
              fontSize: "14px",
              marginBottom: "16px",
              padding: "10px 14px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "6px",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: "100%",
              padding: "12px",
              background: loading || !password ? "#333" : "#3b82f6",
              color: loading || !password ? "#666" : "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: loading || !password ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Checking..." : "Unlock Dashboard"}
          </button>
        </form>

        {/* Footer hint */}
        <p style={{
          color: "#555",
          fontSize: "12px",
          textAlign: "center",
          marginTop: "24px",
          margin: "24px 0 0 0",
        }}>
          Lost your password? Check your{" "}
          <code style={{ color: "#888" }}>DASHBOARD_PASSWORD</code> env var.
        </p>
      </div>
    </div>
  );
}
