"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ChatMessage, {
  ChatTypingIndicator,
  type ChatMessage as ChatMessageType,
} from "./ChatMessage";

const SUGGESTIONS = [
  "Generate posts for my latest commits",
  "Create a tweet about my recent work",
  "Make LinkedIn posts for my last 5 commits",
];

/** Detects if the user is asking to generate posts */
function isGenerationRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const triggers = [
    "generate",
    "create",
    "make",
    "post",
    "tweet",
    "linkedin",
    "social",
    "media",
    "publish",
    "share",
    "write",
    "draft",
    "commit",
    "repo",
    "github",
    "twitter",
    "content",
    "caption",
  ];
  return triggers.some((t) => lower.includes(t));
}

/** Short affirmative replies (e.g. after we offer to generate) — treat as "go generate" */
function isAffirmation(text: string): boolean {
  const lower = text.toLowerCase().trim().replace(/[!.?]+$/, "");
  const affirmations = [
    "yes",
    "yeah",
    "yep",
    "yup",
    "sure",
    "ok",
    "okay",
    "k",
    "go",
    "go ahead",
    "go for it",
    "do it",
    "let's go",
    "lets go",
    "please",
    "please do",
    "sounds good",
  ];
  return affirmations.includes(lower);
}

/**
 * Decide whether a message should reach the LLM. Only post-related requests
 * (and affirmations to generate) hit the API — everything else is handled
 * locally with a friendly canned reply.
 */
function shouldGenerate(text: string): boolean {
  return isGenerationRequest(text) || isAffirmation(text);
}

/** Generate a conversational reply without calling the API */
function getConversationalReply(text: string): string {
  const lower = text.toLowerCase().trim();

  // Greetings
  if (
    lower === "hi" ||
    lower === "hello" ||
    lower === "hey" ||
    lower === "hi there" ||
    lower === "hello there"
  ) {
    return "Hey! 👋 I'm Commit Voice. I can turn your GitHub commits into social media posts. Want me to generate some posts from your recent commits?";
  }

  // How are you
  if (
    lower.includes("how are you") ||
    lower.includes("what's up") ||
    lower.includes("whats up") ||
    lower.includes("how do you do")
  ) {
    return "I'm doing great, thanks for ask! 😊 I'm ready to help you create social media posts from your GitHub commits. Just say the word!";
  }

  // What can you do
  if (
    lower.includes("what can you do") ||
    lower.includes("help") ||
    lower.includes("what do you do") ||
    lower.includes("how does this work") ||
    lower.includes("how do i use")
  ) {
    return "I can generate social media posts from your GitHub commits! Here's what I can do:\n\n• **Generate posts** — I'll fetch your recent commits and create Twitter + LinkedIn posts\n• **Create a tweet** — Just for X/Twitter\n• **Make LinkedIn posts** — Just for LinkedIn\n\nJust ask me to generate posts and I'll get started!";
  }

  // Thanks
  if (
    lower.includes("thank") ||
    lower.includes("thanks") ||
    lower.includes("thx") ||
    lower === "ty"
  ) {
    return "You're welcome! 😊 Let me know if you need anything else.";
  }

  // Bye
  if (
    lower === "bye" ||
    lower === "goodbye" ||
    lower === "see you" ||
    lower === "cya"
  ) {
    return "Goodbye! 👋 Come back anytime you need social media posts!";
  }

  // No / not now
  if (
    lower === "no" ||
    lower === "nope" ||
    lower === "not now" ||
    lower === "later" ||
    lower === "maybe later"
  ) {
    return "No problem! I'm here whenever you're ready. Just ask me to generate posts whenever you want. 😊";
  }

  // Default — guide them
  return "I'd love to help! I can generate social media posts from your GitHub commits. Try saying something like:\n\n• \"Generate posts for my latest commits\"\n• \"Create a tweet about my recent work\"\n• \"Make LinkedIn posts\"\n\nWhat would you like to do?";
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Show welcome message when widget is first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const timer = setTimeout(() => {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              "Hey! 👋 I'm **Commit Voice**. I turn your GitHub commits into social media posts.\n\nWant me to generate some posts from your recent commits?",
            timestamp: new Date(),
          },
        ]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length]);

  async function handleSend(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    // Add user message
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Check if this is a generation request or just conversation
      if (shouldGenerate(messageText)) {
        // Call the API to generate posts
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: messageText }),
        });

        // Parse defensively — on a timeout/crash Vercel returns a plain-text
        // error page, not JSON, so res.json() would throw an ugly parse error.
        const raw = await res.text();
        let data: any = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          data = null;
        }

        if (!res.ok || !data) {
          const friendly =
            data?.error ||
            (res.status === 408 || res.status === 504
              ? "That took a little too long to generate — the model might be busy. Give it another try in a moment! 🙏"
              : "Hmm, something went wrong on my end. Please try again in a moment! 🙏");
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant" as const,
              content: friendly,
              timestamp: new Date(),
            },
          ]);
          return;
        }

        // Success — posts generated
        const assistantMessage: ChatMessageType = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            data.message ||
            `✅ Generated ${data.posts?.length || 0} post(s) from your commits! Check the **Pending** tab to review and publish them.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        toast({
          title: "Posts generated!",
          description: `${data.posts?.length || 0} post(s) added to Pending`,
        });

        // Trigger dashboard refresh
        if (data.posts?.length > 0 && (window as any).__refreshPosts) {
          (window as any).__refreshPosts();
        }
      } else {
        // Conversational reply — no API call needed
        // Small delay to feel natural
        await new Promise((resolve) => setTimeout(resolve, 600));

        const reply = getConversationalReply(messageText);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content: reply,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: any) {
      toast({
        title: "Request failed",
        description: err.message,
        variant: "destructive",
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: `Sorry, something went wrong: ${err.message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSend();
  }

  return (
    <>
      {/* Floating toggle button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
            aria-label="Open chat"
          >
            <MessageSquare className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Commit Voice
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isLoading ? "Thinking..." : "Online"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {isLoading && <ChatTypingIndicator />}

              {/* Show suggestions when there are few messages and not loading */}
              {messages.length <= 1 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex flex-col gap-2 pt-2"
                >
                  <p className="text-xs text-muted-foreground">
                    Try one of these:
                  </p>
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="text-xs text-left px-3 py-2 rounded-lg border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form
              onSubmit={handleSubmit}
              className="p-3 border-t border-border bg-card"
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isLoading}
                  className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim()}
                  className="h-10 w-10"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
