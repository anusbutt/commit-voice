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
  /** Why no commits were found — used by chat widget to give helpful messages */
  emptyReason?:
    | "no_events"           // No PushEvents at all
    | "all_trivial"         // Had commits but all were trivial (merge, fix typo, etc.)
    | "no_repos"            // User has no public repos
    | "api_error"           // GitHub API failed (rate limit, auth, etc.)
    | "no_meaningful";      // Had events but none with meaningful commits
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
 * Pick the commits to generate posts from, newest first.
 * Prefers meaningful commits, but never returns empty when there ARE commits —
 * if everything looks trivial we still fall back to the latest ones so the
 * user always gets posts for their latest work.
 */
function selectLatestCommits(all: Commit[]): Commit[] {
  const sorted = [...all].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const meaningful = sorted.filter((c) => !isTrivial(c.message));
  const chosen = meaningful.length > 0 ? meaningful : sorted;
  return chosen.slice(0, 15);
}

/**
 * Fetch the latest commits from GitHub for a given username.
 * First tries the Events API, then falls back to the Repos API (sorted by most
 * recently pushed) to get the latest commits regardless of event recency.
 * Returns emptyReason to help the caller explain what happened.
 */
export async function fetchLatestCommits(
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

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Commit-Voice/1.0",
  };

  // Strategy 1: Try Events API — the fast path for the most recent public pushes.
  // If it yields no commits, we fall through to the Repos API rather than
  // giving up, so we always surface the user's latest work.
  try {
    const eventsResponse = await fetch(
      `https://api.github.com/users/${ghUsername}/events/public?per_page=100`,
      { headers }
    );

    if (eventsResponse.ok) {
      const events: any[] = await eventsResponse.json();

      const pushEvents = events.filter(
        (e: any) => e.type === "PushEvent" && Array.isArray(e.payload?.commits)
      );

      const allCommits: Commit[] = pushEvents.flatMap((e: any) =>
        e.payload.commits.map((c: any) => ({
          sha: c.sha.substring(0, 7),
          message: c.message.split("\n")[0].trim(),
          repo: e.repo.name,
          date: e.created_at,
          url: `https://github.com/${e.repo.name}/commit/${c.sha}`,
        }))
      );

      if (allCommits.length > 0) {
        const selected = selectLatestCommits(allCommits);
        const repos = [...new Set(selected.map((c) => c.repo))];
        return { commits: selected, repos };
      }
      // No push commits in the event feed — fall through to the Repos API.
    } else if (
      eventsResponse.status === 401 ||
      eventsResponse.status === 403
    ) {
      // API returned an auth/rate-limit status
      throw new Error(`GitHub API ${eventsResponse.status}: ${eventsResponse.statusText}`);
    }
  } catch (err: any) {
    if (err.message?.includes("GitHub API")) throw err; // Re-throw auth errors
    console.warn("[github] Events API failed:", err.message);
  }

  // Strategy 2: Repos API — authoritative source for the latest commits.
  // Sort by most recently pushed so we always get the user's newest work.
  try {
    const reposResponse = await fetch(
      `https://api.github.com/users/${ghUsername}/repos?sort=pushed&per_page=10&type=owner`,
      { headers }
    );

    if (!reposResponse.ok) {
      if (reposResponse.status === 401 || reposResponse.status === 403) {
        throw new Error(`GitHub API ${reposResponse.status}: ${reposResponse.statusText}`);
      }
      return { commits: [], repos: [], emptyReason: "api_error" };
    }

    const repos: any[] = await reposResponse.json();

    if (repos.length === 0) {
      return { commits: [], repos: [], emptyReason: "no_repos" };
    }

    const allCommits: Commit[] = [];

    for (const repo of repos.slice(0, 5)) {
      try {
        const commitsResponse = await fetch(
          `https://api.github.com/repos/${ghUsername}/${repo.name}/commits?per_page=10&author=${ghUsername}`,
          { headers }
        );

        if (commitsResponse.ok) {
          const repoCommits: any[] = await commitsResponse.json();
          for (const rc of repoCommits) {
            allCommits.push({
              sha: rc.sha.substring(0, 7),
              message: rc.commit.message.split("\n")[0].trim(),
              repo: repo.full_name,
              date: rc.commit.author?.date || new Date().toISOString(),
              url: rc.html_url,
            });
          }
        }
      } catch (err: any) {
        console.warn(`[github] Failed to fetch commits for ${repo.name}:`, err.message);
      }
    }

    if (allCommits.length === 0) {
      return { commits: [], repos: [], emptyReason: "no_events" };
    }

    const selected = selectLatestCommits(allCommits);
    const repoNames = [...new Set(selected.map((c) => c.repo))];
    return { commits: selected, repos: repoNames };
  } catch (err: any) {
    if (err.message?.includes("GitHub API")) throw err;
    console.warn("[github] Repos API failed:", err.message);
  }

  return { commits: [], repos: [], emptyReason: "api_error" };
}

/**
 * Build the LLM prompt for post generation from commits.
 */
export function buildPostPrompt(commits: Commit[]): string {
  const commitSummary = commits
    .map((c) => `- \`${c.sha}\` **${c.repo}**: ${c.message}`)
    .join("\n");

  return `You are a social media assistant for a software engineer. Based on their latest GitHub commits below, generate TWO social media posts.

Latest commits:
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
