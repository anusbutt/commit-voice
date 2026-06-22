"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import PostCard from "./PostCard";
import ThemeToggle from "./ThemeToggle";
import EmptyState from "./EmptyState";
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

  const fetchPosts = useCallback(async (tab: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts?status=${tab}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(activeTab);
  }, [activeTab, fetchPosts]);

  // Expose a refresh function so ChatWidget can trigger updates
  useEffect(() => {
    (window as any).__refreshPosts = () => fetchPosts(activeTab);
    return () => {
      delete (window as any).__refreshPosts;
    };
  }, [fetchPosts, activeTab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "posted", label: "Posted" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            🎙️ Commit Voice
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered social media posts from your commits
          </p>
        </div>
        <ThemeToggle />
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="pending" onValueChange={(v) => setActiveTab(v as Tab)}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <TabsList className="mb-6">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </motion.div>

        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-border p-6 space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex gap-3 mt-4">
                      <Skeleton className="h-9 flex-1" />
                      <Skeleton className="h-9 flex-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-destructive"
              >
                <p>{error}</p>
              </motion.div>
            ) : posts.length === 0 ? (
              <EmptyState activeTab={activeTab} />
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="flex flex-col gap-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Chat Widget */}
      <ChatWidget />
    </main>
  );
}
