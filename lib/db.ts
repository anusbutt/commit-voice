import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let sqlInstance: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (!sqlInstance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL environment variable is not set");
    // cache: "no-store" is critical — the Neon driver issues queries as
    // fetch() POSTs, and Next.js/Vercel's Data Cache can replay stale
    // responses for repeated query+params keys (even across deployments),
    // resurrecting long-deleted rows. Bypass the fetch cache entirely.
    sqlInstance = neon(url, { fetchOptions: { cache: "no-store" } });
  }
  return sqlInstance;
}

export interface Post {
  id: number;
  content: string;
  platform: "twitter" | "linkedin";
  status: "pending" | "posted" | "rejected";
  repo_name: string | null;
  commit_sha: string | null;
  created_at: string;
  posted_at: string | null;
  error_message: string | null;
}

export async function getPendingPosts(): Promise<Post[]> {
  const rows = await getSql()`SELECT * FROM posts WHERE status = 'pending' ORDER BY created_at DESC`;
  return rows as Post[];
}

export async function getAllPosts(): Promise<Post[]> {
  const rows = await getSql()`SELECT * FROM posts ORDER BY created_at DESC`;
  return rows as Post[];
}

export async function getPostsByStatus(status: string): Promise<Post[]> {
  const rows = await getSql()`SELECT * FROM posts WHERE status = ${status} ORDER BY created_at DESC`;
  return rows as Post[];
}

export async function createPost(
  content: string,
  platform: "twitter" | "linkedin",
  repoName: string | null,
  commitSha: string | null
): Promise<Post[]> {
  const rows = await getSql()`
    INSERT INTO posts (content, platform, repo_name, commit_sha)
    VALUES (${content}, ${platform}, ${repoName}, ${commitSha})
    ON CONFLICT (commit_sha, platform) DO NOTHING
    RETURNING *
  `;
  return rows as Post[];
}

export async function updatePostStatus(
  id: number,
  status: "posted" | "rejected",
  errorMessage?: string
): Promise<Post[]> {
  if (status === "posted") {
    const rows = await getSql()`UPDATE posts SET status = 'posted', posted_at = NOW() WHERE id = ${id} RETURNING *`;
    return rows as Post[];
  }
  const rows = await getSql()`UPDATE posts SET status = ${status}, error_message = ${errorMessage || null} WHERE id = ${id} RETURNING *`;
  return rows as Post[];
}

export async function getPostById(id: number): Promise<Post | null> {
  const rows = await getSql()`SELECT * FROM posts WHERE id = ${id}`;
  return (rows[0] as Post) || null;
}
