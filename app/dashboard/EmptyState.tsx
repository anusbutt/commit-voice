"use client";

import { motion } from "framer-motion";
import { MessageSquarePlus, Inbox } from "lucide-react";

interface EmptyStateProps {
  activeTab: string;
}

export default function EmptyState({ activeTab }: EmptyStateProps) {
  const messages: Record<string, { icon: React.ReactNode; title: string; subtitle: string }> = {
    pending: {
      icon: <Inbox className="h-12 w-12 text-muted-foreground/40" />,
      title: "No pending posts",
      subtitle: "Use the chat widget to generate posts from your commits, or wait for the daily cron.",
    },
    posted: {
      icon: <Inbox className="h-12 w-12 text-muted-foreground/40" />,
      title: "No posted posts yet",
      subtitle: "Approve pending posts to see them here.",
    },
    rejected: {
      icon: <Inbox className="h-12 w-12 text-muted-foreground/40" />,
      title: "No rejected posts",
      subtitle: "Rejected posts will appear here.",
    },
  };

  const { icon, title, subtitle } = messages[activeTab] || messages.pending;

  return (
    <motion.div
      key={activeTab}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
      >
        {icon}
      </motion.div>
      <h3 className="mt-4 text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">{subtitle}</p>
      {activeTab === "pending" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>Try: "Generate posts for my latest commits"</span>
        </motion.div>
      )}
    </motion.div>
  );
}
