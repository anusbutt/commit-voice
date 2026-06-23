import { defineSchedule } from "eve/schedules";
import { createPost } from "../../lib/db.js";
import { fetchRecentCommits, buildPostPrompt } from "../../lib/github.js";

export default defineSchedule({
  cron: "0 18 * * *", // 6:00 PM UTC daily

  async run({ receive, waitUntil, appAuth }) {
    const channelId = process.env.SLACK_CHANNEL_ID!;

    if (!channelId) {
      console.error("[daily-posts] Missing SLACK_CHANNEL_ID");
      return;
    }

    // Step 1: Fetch recent commits (shared logic)
    let result;
    try {
      result = await fetchRecentCommits();
    } catch (err: any) {
      console.error(`[daily-posts] GitHub fetch failed: ${err.message}`);
      waitUntil(
        receive("slack", {
          message: `:warning: *Commit Voice — GitHub Fetch Failed*\nCould not fetch commits: ${err.message}\n\nCheck that GITHUB_TOKEN is valid and has not expired.`,
          target: { channelId },
          auth: appAuth,
        })
      );
      return;
    }

    // Step 2: If no meaningful commits, report and exit
    if (result.commits.length === 0) {
      console.log("[daily-posts] No meaningful commits found");
      return;
    }

    // Step 3: Build LLM prompt (shared logic)
    const prompt = buildPostPrompt(result.commits);

    // Step 4: Send prompt to agent LLM and receive generated posts
    let posts: any;
    try {
      const llmResult = await receive("agent", { message: prompt });
      // Strip markdown code fences from LLM response before parsing
      const clean = typeof llmResult === "string"
        ? llmResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        : llmResult;
      posts = typeof clean === "string" ? JSON.parse(clean) : clean;

      if (!posts?.twitter || !posts?.linkedin) {
        throw new Error("LLM returned incomplete response — missing twitter or linkedin post");
      }
    } catch (err: any) {
      console.error(`[daily-posts] Post generation failed: ${err.message}`);
      waitUntil(
        receive("slack", {
          message: `:warning: *Commit Voice — Post Generation Failed*\nFound ${result.commits.length} meaningful commits but could not generate posts: ${err.message}\n\nCommits found in: ${result.repos.join(", ")}`,
          target: { channelId },
          auth: appAuth,
        })
      );
      return;
    }

    // Step 5: Save posts to Neon DB (pending status)
    const createdPosts = [];
    try {
      const twitterResult = await createPost(
        posts.twitter.content,
        "twitter",
        result.repos[0] || null,
        result.commits[0]?.sha || null
      );
      if (twitterResult.length > 0) createdPosts.push(twitterResult[0]);

      const linkedinResult = await createPost(
        posts.linkedin.content,
        "linkedin",
        result.repos[0] || null,
        result.commits[0]?.sha || null
      );
      if (linkedinResult.length > 0) createdPosts.push(linkedinResult[0]);

      console.log(`[daily-posts] Created ${createdPosts.length} pending posts`);
    } catch (err: any) {
      console.error(`[daily-posts] Failed to save posts to DB: ${err.message}`);
    }

    // Step 6: Notify Slack about new pending posts
    if (createdPosts.length > 0) {
      waitUntil(
        receive("slack", {
          message: `:iphone: *New posts pending review!*\n${createdPosts.length} post(s) generated from ${result.commits.length} commits.\n\nReview and publish: https://commit-voice.vercel.app/dashboard`,
          target: { channelId },
          auth: appAuth,
        })
      );
    }
  },
});
