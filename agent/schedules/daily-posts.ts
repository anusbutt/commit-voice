import { defineSchedule } from "eve/schedules";

// Trivial commit patterns to filter out
const TRIVIAL_PATTERNS = [
  /^merge/i,
  /^bump/i,
  /^fix typo/i,
  /^update dependency/i,
  /^readme/i,
  /^wip/i,
  /^tmp/i,
  /^temp/i,
  /^test$/i,
];

function isTrivial(message: string): boolean {
  return TRIVIAL_PATTERNS.some((p) => p.test(message));
}

export default defineSchedule({
  cron: "0 18 * * *", // 6:00 PM UTC daily

  async run({ receive, waitUntil, appAuth }) {
    const username = process.env.GITHUB_USERNAME!;
    const channelId = process.env.SLACK_CHANNEL_ID!;

    if (!username || !channelId) {
      console.error("[daily-posts] Missing GITHUB_USERNAME or SLACK_CHANNEL_ID");
      return;
    }

    // Step 1: Fetch recent commits from GitHub Events API
    let events: any[];
    try {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const response = await fetch(
        `https://api.github.com/users/${username}/events/public?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API ${response.status}: ${response.statusText}`);
      }

      events = await response.json();
    } catch (err: any) {
      console.error(`[daily-posts] GitHub fetch failed: ${err.message}`);
      waitUntil(
        receive("slack", {
          message: `:warning: *Commit Voice — GitHub Fetch Failed*\nCould not fetch commits for \`${username}\`: ${err.message}\n\nCheck that GITHUB_TOKEN is valid and has not expired.`,
          target: { channelId },
          auth: appAuth,
        })
      );
      return;
    }

    // Step 2: Filter to PushEvents and extract commits
    const commits = events
      .filter((e: any) => e.type === "PushEvent")
      .flatMap((e: any) =>
        e.payload.commits.map((c: any) => ({
          sha: c.sha.substring(0, 7),
          message: c.message.split("\n")[0].trim(),
          repo: e.repo.name,
          date: e.created_at,
          url: `https://github.com/${e.repo.name}/commit/${c.sha}`,
        }))
      );

    // Step 3: Filter out trivial commits
    const meaningful = commits.filter((c: any) => !isTrivial(c.message));

    // Step 4: If no meaningful commits, report and exit
    if (meaningful.length === 0) {
      waitUntil(
        receive("slack", {
          message: `:information_source: *Commit Voice — No Activity Today*\nNo meaningful commits found for \`${username}\` in the last 48 hours.\n\nPush some code and I'll generate your posts tomorrow! :rocket:`,
          target: { channelId },
          auth: appAuth,
        })
      );
      return;
    }

    // Step 5: Cap at 15 commits for token budget
    const selected = meaningful.slice(0, 15);
    const reposList = [...new Set(selected.map((c: any) => c.repo))];
    const commitSummary = selected
      .map((c: any) => `- \`${c.sha}\` **${c.repo}**: ${c.message}`)
      .join("\n");

    // Step 6: Build LLM prompt for post generation
    const prompt = `You are a social media assistant for a software engineer. Based on their recent GitHub commits below, generate TWO social media posts.

Recent commits:
${commitSummary}

## X/Twitter Post Requirements
- Max 280 characters (hard limit — count carefully)
- First-person, conversational, casual tone
- Start with what was built, not "I just committed..."
- Include a specific detail (tech stack, problem solved, metric)
- Max 2 hashtags
- Mention the repo name or technology
- End with a question or call to action to engage readers
- Example: "Just shipped a Redis caching layer for our API. Response times dropped from 200ms to 15ms. The trick? Write-through with a 5-min TTL. #WebDev #Performance"

## LinkedIn Post Requirements
- Max 3000 characters
- Professional but authentic tone
- Structure: Problem → Solution → Lesson Learned
- Explain the "why" behind technical decisions
- Share what was learned — admit what was hard
- 3-5 hashtags
- Invite discussion with a closing question
- Example: "This week I tackled a performance bottleneck in our data pipeline. The root cause: N+1 queries in batch processing. Solution: DataLoader pattern with Redis caching. Result: 10x throughput. Key lesson: Always profile before optimizing."

Return ONLY valid JSON (no markdown fences, no extra text):
{"twitter":{"content":"...","hashtags":["..."]},"linkedin":{"content":"...","hashtags":["..."]}}`;

    // Step 7: Send prompt to agent LLM and receive generated posts
    let posts: any;
    try {
      const result = await receive("agent", { message: prompt });
      posts = typeof result === "string" ? JSON.parse(result) : result;

      if (!posts?.twitter || !posts?.linkedin) {
        throw new Error("LLM returned incomplete response — missing twitter or linkedin post");
      }
    } catch (err: any) {
      console.error(`[daily-posts] Post generation failed: ${err.message}`);
      waitUntil(
        receive("slack", {
          message: `:warning: *Commit Voice — Post Generation Failed*\nFound ${selected.length} meaningful commits but could not generate posts: ${err.message}\n\nCommits found in: ${reposList.join(", ")}`,
          target: { channelId },
          auth: appAuth,
        })
      );
      return;
    }

    // Step 8: Format and deliver to Slack
    const twitterFull = `${posts.twitter.content}\n\n${posts.twitter.hashtags.map((h: string) => `#${h}`).join(" ")}`;
    const linkedinFull = `${posts.linkedin.content}\n\n${posts.linkedin.hashtags.map((h: string) => `#${h}`).join(" ")}`;

    const slackMessage = `:iphone: *Your Daily Social Media Posts*

*Twitter/X:*
${twitterFull}

*LinkedIn:*
${linkedinFull}

---
_Repos referenced: ${reposList.join(", ")}_
_Commits analyzed: ${selected.length}_
_Generated at: ${new Date().toISOString()}_`;

    waitUntil(
      receive("slack", {
        message: slackMessage,
        target: { channelId },
        auth: appAuth,
      })
    );
  },
});
