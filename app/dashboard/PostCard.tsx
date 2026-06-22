"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

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
  const platformColor = post.platform === "twitter" ? "var(--twitter)" : "var(--linkedin)";

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
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className={isDone ? "opacity-50" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-md text-white"
                style={{ backgroundColor: platformColor }}
              >
                {platformLabel}
              </span>
              {post.status === "posted" && (
                <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
                  ✓ Posted
                </span>
              )}
              {post.status === "rejected" && (
                <span className="text-xs font-medium text-destructive">
                  ✗ Rejected
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
            {post.content}
          </p>
        </CardContent>

        <CardFooter className="flex-col items-start gap-2 pt-0">
          {/* Meta info */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            {post.repo_name && <span>📁 {post.repo_name}</span>}
            {post.commit_sha && (
              <span className="font-mono">🔗 {post.commit_sha}</span>
            )}
          </div>

          {/* Posted timestamp */}
          {post.posted_at && (
            <p className="text-xs" style={{ color: "var(--success)" }}>
              ✅ Posted: {new Date(post.posted_at).toLocaleString()}
            </p>
          )}

          {/* Error message */}
          {post.error_message && (
            <p className="text-xs text-destructive">
              ⚠️ {post.error_message}
            </p>
          )}

          {/* Action status */}
          {status === "error" && (
            <p className="text-sm text-destructive">{message}</p>
          )}
          {status === "done" && (
            <p className="text-sm" style={{ color: "var(--success)" }}>
              {message}
            </p>
          )}

          {/* Action buttons — only for pending posts */}
          {isPending && !isDone && (
            <div className="flex gap-3 w-full mt-2">
              <Button
                onClick={handleApprove}
                disabled={status === "loading"}
                className="flex-1"
                style={{ backgroundColor: "var(--success)", color: "#fff" }}
              >
                {status === "loading" ? "Posting..." : "Post"}
              </Button>
              <Button
                onClick={handleReject}
                disabled={status === "loading"}
                variant="destructive"
                className="flex-1"
              >
                Reject
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
