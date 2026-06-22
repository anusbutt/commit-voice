/**
 * Shared GitHub commit fetching logic.
 * Used by both the daily cron schedule and the chat endpoint.
 */

export interface Commit {
  sha: string;
  message: string;
  repo: string;
  date: string;
  url: string;
}

export interface CommitFetchResult {
  commits: Commit[];
  repos: string[];
}

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

/**
 * Fetch recent meaningful commits from GitHub for a given username.
 * Returns up to 15 non-trivial commits from public PushEvents.
 */
export async function fetchRecentCommits(
  username?: string
): Promise<CommitFetchResult> {
  const ghUsername = username || process.env.GITHUB_USERNAME;
  if (!ghUsername) {
    throw new Error("GITHUB_USERNAME environment variable is not set");
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }

  // Fetch public events
  const response = await fetch(
    `https://api.github.com/users/${ghUsername}/events/public?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${response.statusText}`);
  }

  const events: any[] = await response.json();

  // Extract commits from PushEvents
  const commits: Commit[] = events
    .filter((e: any) => e.type === "PushEvent" && Array.isArray(e.payload?.commits))
    .flatMap((e: any) =>
      e.payload.commits.map((c: any) => ({
        sha: c.sha.substring(0, 7),
        message: c.message.split("\n")[0].trim(),
        repo: e.repo.name,
        date: e.created_at,
        url: `https://github.com/${e.repo.name}/commit/${c.sha}`,
      }))
    );

  // Filter trivial commits
  const meaningful = commits.filter((c) => !isTrivial(c.message));

  if (meaningful.length === 0) {
    return { commits: [], repos: [] };
  }

  // Cap at 15 for token budget
  const selected = meaningful.slice(0, 15);
  const repos = [...new Set(selected.map((c) => c.repo))];

  return { commits: selected, repos };
}

/**
 * Build the LLM prompt for post generation from commits.
 */
export function buildPostPrompt(commits: Commit[]): string {
  const commitSummary = commits
    .map((c) => `- \`${c.sha}\` **${c.repo}**: ${c.message}`)
    .join("\n");

  return `You are a social media assistant for a software engineer. Based on their recent GitHub commits below, generate TWO social media posts.

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

## LinkedIn Post Requirements
- Max 3000 characters
- Professional but authentic tone
- Structure: Problem → Solution → Lesson Learned
- Explain the "why" behind technical decisions
- Share what was learned — admit what was hard
- 3-5 hashtags
- Invite discussion with a closing question

Return ONLY valid JSON (no markdown fences, no extra text):
{"twitter":{"content":"...","hashtags":["..."]},"linkedin":{"content":"...","hashtags":["..."]}}`;
}
