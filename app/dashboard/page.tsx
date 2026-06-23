"use client";

import { useEffect, useState, FormEvent } from "react";
import PostCard from "./PostCard";
import ChatWidget from "./ChatWidget";

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

type Tab = "pending" | "posted" | "rejected";

export default function DashboardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/posts?status=${activeTab}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch posts");
        const data = await res.json();
        setPosts(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, [activeTab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "posted", label: "Posted" },
    { key: "rejected", label: "Rejected" },
  ];

  async function handleLogout(e: FormEvent) {
    e.preventDefault();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Commit Voice Dashboard</h1>
        <form onSubmit={handleLogout}>
          <button
            type="submit"
            style={{
              background: "transparent",
              color: "#888",
              border: "1px solid #333",
              padding: "6px 14px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Sign out
          </button>
        </form>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", margin: "1.5rem 0" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? "#3b82f6" : "#222",
              color: "#fff",
              border: "1px solid #333",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: "#888" }}>Loading posts...</p>}
      {error && <p style={{ color: "#ef4444" }}>{error}</p>}

      {!loading && !error && posts.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
          <p>No {activeTab} posts.</p>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Chat Widget */}
      <ChatWidget />
    </main>
  );
}
