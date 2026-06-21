import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description:
    "Fetch recent public commits from a GitHub user's repositories via the Events API. Returns structured commit data including SHA, message, repo, date, and URL. Use when: checking for new commits, fetching recent activity, getting commit history for post generation.",
  inputSchema: z.object({
    username: z.string().describe("GitHub username to fetch commits for"),
    since: z
      .string()
      .optional()
      .describe("ISO 8601 date string — only return commits after this date"),
    per_page: z
      .number()
      .default(15)
      .describe("Number of commits to return (max 30, default 15)"),
  }),
  async execute({ username, since, per_page }) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is not set");
    }

    const params = new URLSearchParams({
      per_page: String(Math.min(per_page, 30)),
    });
    if (since) params.set("since", since);

    const response = await fetch(
      `https://api.github.com/users/${username}/events/public?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
    }

    const events = await response.json();

    // Filter to PushEvents only — these contain actual code commits
    const pushEvents = events.filter((e: any) => e.type === "PushEvent");

    // Extract commits from push events
    const commits = pushEvents.flatMap((e: any) =>
      e.payload.commits.map((c: any) => ({
        sha: c.sha.substring(0, 7),
        message: c.message.split("\n")[0], // First line only
        repo: e.repo.name,
        date: e.created_at,
        url: `https://github.com/${e.repo.name}/commit/${c.sha}`,
      }))
    );

    return {
      commits: commits.slice(0, per_page),
      total_found: commits.length,
      fetched_at: new Date().toISOString(),
    };
  },
});
