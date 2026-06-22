import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { createPost } from "@/lib/db";
import { fetchRecentCommits, buildPostPrompt } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Step 1: Fetch recent commits
    let commitResult;
    try {
      commitResult = await fetchRecentCommits();
    } catch (err: any) {
      return NextResponse.json(
        { error: `Failed to fetch commits: ${err.message}` },
        { status: 502 }
      );
    }

    if (commitResult.commits.length === 0) {
      return NextResponse.json(
        { error: "No recent commits found. Push some commits to GitHub first!" },
        { status: 404 }
      );
    }

    // Step 2: Build prompt from commits + user message
    const basePrompt = buildPostPrompt(commitResult.commits);
    const prompt = `${basePrompt}\n\nUser request: ${message}`;

    // Step 3: Generate posts via OpenRouter
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured" },
        { status: 500 }
      );
    }

    let generatedPosts: any;
    try {
      const { text } = await generateText({
        model: openrouter("anthropic/claude-sonnet-4.6", {
          apiKey: openrouterApiKey,
        }),
        prompt,
      });

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*"twitter"[\s\S]*"linkedin"[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI response did not contain valid post JSON");
      }
      generatedPosts = JSON.parse(jsonMatch[0]);

      if (!generatedPosts?.twitter?.content || !generatedPosts?.linkedin?.content) {
        throw new Error("AI response missing twitter or linkedin content");
      }
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
      return NextResponse.json(
        { error: `Failed to save posts: ${err.message}` },
        { status: 500 }
      );
    }

    // Step 5: Return saved posts
    return NextResponse.json({
      success: true,
      posts: savedPosts,
      message: `Generated ${savedPosts.length} post(s) from ${commitResult.commits.length} commits`,
    });
  } catch (err: any) {
    console.error("[/api/chat] Error:", err.message || err);
    return NextResponse.json(
      { error: "Chat request failed" },
      { status: 500 }
    );
  }
}
