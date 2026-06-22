import { getPendingPosts } from "@/lib/db";
import PostCard from "./PostCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const posts = await getPendingPosts();

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Commit Voice Dashboard</h1>
      <p style={{ color: "#888", marginBottom: "2rem" }}>
        {posts.length} pending post{posts.length !== 1 ? "s" : ""} waiting for review
      </p>

      {posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
          <p>No pending posts. The agent will generate posts daily at 6 PM UTC.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
