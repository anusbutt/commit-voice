"use client";

import { useState } from "react";

interface Post {
  id: number;
  content: string;
  platform: string;
  status: string;
  repo_name: string | null;
  commit_sha: string | null;
  created_at: string;
  posted_at: string | null;
  error_message: string | null;
}

export default function PostCard({ post }: { post: Post }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const platformLabel = post.platform === "twitter" ? "X/Twitter" : "LinkedIn";
  const platformColor = post.platform === "twitter" ? "#1d9bf0" : "#0a66c2";

  async function handleApprove() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/posts/${post.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("done");
        setMessage("Posted!");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to post");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
    }
  }

  async function handleReject() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/posts/${post.id}/reject`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("done");
        setMessage("Rejected");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
    }
  }

  const isDone = status === "done";
  const isPending = post.status === "pending";

  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 12,
        padding: "1.5rem",
        background: "#111",
        opacity: isDone ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span
            style={{
              background: platformColor,
              color: "#fff",
              padding: "0.2rem 0.6rem",
              borderRadius: 4,
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            {platformLabel}
          </span>
          {post.status === "posted" && (
            <span style={{ color: "#22c55e", fontSize: "0.75rem" }}>✓ Posted</span>
          )}
          {post.status === "rejected" && (
            <span style={{ color: "#ef4444", fontSize: "0.75rem" }}>✗ Rejected</span>
          )}
        </div>
        <span style={{ color: "#666", fontSize: "0.8rem" }}>
          {new Date(post.created_at).toLocaleDateString()}
        </span>
      </div>

      <p style={{ marginBottom: "1rem", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
        {post.content}
      </p>

      <div style={{ display: "flex", gap: "1rem", color: "#666", fontSize: "0.8rem" }}>
        {post.repo_name && <span>Repo: {post.repo_name}</span>}
        {post.commit_sha && <span>SHA: {post.commit_sha}</span>}
      </div>

      {post.posted_at && (
        <p style={{ color: "#22c55e", fontSize: "0.8rem", marginTop: "0.5rem" }}>
          Posted: {new Date(post.posted_at).toLocaleString()}
        </p>
      )}

      {post.error_message && (
        <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem" }}>
          Error: {post.error_message}
        </p>
      )}

      {status === "error" && (
        <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "0.75rem" }}>
          {message}
        </p>
      )}

      {status === "done" && (
        <p style={{ color: "#22c55e", fontSize: "0.85rem", marginTop: "0.75rem" }}>
          {message}
        </p>
      )}

      {isPending && !isDone && (
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <button
            onClick={handleApprove}
            disabled={status === "loading"}
            style={{
              background: "#22c55e",
              color: "#fff",
              flex: 1,
            }}
          >
            {status === "loading" ? "Posting..." : "Post"}
          </button>
          <button
            onClick={handleReject}
            disabled={status === "loading"}
            style={{
              background: "#ef4444",
              color: "#fff",
              flex: 1,
            }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
