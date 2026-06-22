import { neon, NeonQueryFunction } from "@neondatabase/serverless";

declare global {
  // eslint-disable-next-line no-var
  var sql: NeonQueryFunction<false, false> | undefined;
}

const sql = neon(process.env.DATABASE_URL!);

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
  return sql`SELECT * FROM posts WHERE status = 'pending' ORDER BY created_at DESC`;
}

export async function getAllPosts(): Promise<Post[]> {
  return sql`SELECT * FROM posts ORDER BY created_at DESC`;
}

export async function getPostsByStatus(status: string): Promise<Post[]> {
  return sql`SELECT * FROM posts WHERE status = ${status} ORDER BY created_at DESC`;
}

export async function createPost(
  content: string,
  platform: "twitter" | "linkedin",
  repoName: string | null,
  commitSha: string | null
): Promise<Post[]> {
  return sql`
    INSERT INTO posts (content, platform, repo_name, commit_sha)
    VALUES (${content}, ${platform}, ${repoName}, ${commitSha})
    ON CONFLICT (commit_sha, platform) DO NOTHING
    RETURNING *
  `;
}

export async function updatePostStatus(
  id: number,
  status: "posted" | "rejected",
  errorMessage?: string
): Promise<Post[]> {
  if (status === "posted") {
    return sql`UPDATE posts SET status = 'posted', posted_at = NOW() WHERE id = ${id} RETURNING *`;
  }
  return sql`UPDATE posts SET status = ${status}, error_message = ${errorMessage || null} WHERE id = ${id} RETURNING *`;
}

export async function getPostById(id: number): Promise<Post | null> {
  const rows = await sql`SELECT * FROM posts WHERE id = ${id}`;
  return rows[0] || null;
}

export { sql };
