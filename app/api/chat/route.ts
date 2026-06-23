import { NextRequest, NextResponse } from "next/server";
import { createPost } from "@/lib/db";
import { fetchRecentCommits, buildPostPrompt } from "@/lib/github";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel: allow up to 60 seconds

export async function POST(request: NextRequest) {
  console.log("[/api/chat] Request received");

  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    console.log("[/api/chat] Message:", message);

    // Step 1: Fetch recent commits
    let commitResult;
    try {
      commitResult = await fetchRecentCommits();
      console.log("[/api/chat] Commits fetched:", commitResult.commits.length);
    } catch (err: any) {
      console.error("[/api/chat] Commit fetch error:", err.message);
      return NextResponse.json(
        { error: `Failed to fetch commits: ${err.message}` },
        { status: 502 }
      );
    }

    if (commitResult.commits.length === 0) {
      const reason = commitResult.emptyReason || "no_events";
      const messages: Record<string, string> = {
        no_events:
          "I couldn't find any recent commits from you. It looks like you haven't pushed anything to GitHub recently. Try pushing some commits and then ask me to generate posts!",
        all_trivial:
          "I found some commits, but they're all routine ones (merges, typo fixes, dependency updates). I need more meaningful commits to create good posts. Try making some feature commits with descriptive messages!",
        no_repos:
          "I couldn't find any public repositories for your account. Make sure you have public repos with commits, or check that your GitHub token has the right permissions.",
        api_error:
          "I'm having trouble reaching GitHub right now. This might be a rate limit or connection issue. Please try again in a minute!",
        no_meaningful:
          "I found some commits but none were meaningful enough for posts. Try making commits with more descriptive messages about features or fixes!",
      };
      return NextResponse.json(
        { error: messages[reason] || messages.no_events, emptyReason: reason },
        { status: 404 }
      );
    }

    // Step 2: Build prompt
    const basePrompt = buildPostPrompt(commitResult.commits);
    const fullPrompt = `${basePrompt}\n\nUser request: ${message}`;

    // Step 3: Generate posts via OpenRouter
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      console.error("[/api/chat] OPENROUTER_API_KEY not set");
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured" },
        { status: 500 }
      );
    }

    console.log("[/api/chat] Calling OpenRouter API...");

    let generatedPosts: any;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 50000); // 50s timeout

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL ||
            "https://commit-voice.vercel.app",
          "X-Title": "Commit Voice",
        },
        body: JSON.stringify({
          model: "openrouter/owl-alpha",
          messages: [{ role: "user", content: fullPrompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      console.log("[/api/chat] OpenRouter response status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("[/api/chat] OpenRouter error:", res.status, errorText);
        throw new Error(`OpenRouter API ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        console.error("[/api/chat] Empty response:", JSON.stringify(data));
        throw new Error("OpenRouter returned empty response");
      }

      console.log("[/api/chat] Response text length:", text.length);

      // Parse JSON from response
      const jsonMatch = text.match(
        /\{[\s\S]*"twitter"[\s\S]*"linkedin"[\s\S]*\}/
      );
      if (!jsonMatch) {
        console.error("[/api/chat] No JSON found in response:", text);
        throw new Error("AI response did not contain valid post JSON");
      }
      generatedPosts = JSON.parse(jsonMatch[0]);

      if (
        !generatedPosts?.twitter?.content ||
        !generatedPosts?.linkedin?.content
      ) {
        throw new Error("AI response missing twitter or linkedin content");
      }

      console.log("[/api/chat] Posts generated successfully");
    } catch (err: any) {
      console.error("[/api/chat] Generation error:", err.message || err);
      return NextResponse.json(
        { error: `Post generation failed: ${err.message}` },
        { status: 502 }
      );
    }

    // Step 4: Save to Neon DB
    const savedPosts: any[] = [];
    try {
      const twitterResult = await createPost(
        generatedPosts.twitter.content,
        "twitter",
        commitResult.repos[0] || null,
        commitResult.commits[0]?.sha || null
      );
      if (twitterResult.length > 0) savedPosts.push(twitterResult[0]);

      const linkedinResult = await createPost(
        generatedPosts.linkedin.content,
        "linkedin",
        commitResult.repos[0] || null,
        commitResult.commits[0]?.sha || null
      );
      if (linkedinResult.length > 0) savedPosts.push(linkedinResult[0]);
    } catch (err: any) {
      console.error("[/api/chat] DB save error:", err.message);
      return NextResponse.json(
        { error: `Failed to save posts: ${err.message}` },
        { status: 500 }
      );
    }

    console.log("[/api/chat] Saved", savedPosts.length, "posts");

    // Step 5: Return
    return NextResponse.json({
      success: true,
      posts: savedPosts,
      message: `Generated ${savedPosts.length} post(s) from ${commitResult.commits.length} commits`,
    });
  } catch (err: any) {
    console.error("[/api/chat] Unhandled error:", err.message || err);
    return NextResponse.json({ error: "Chat request failed" }, { status: 500 });
  }
}
