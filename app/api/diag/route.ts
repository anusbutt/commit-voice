import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getAllPosts, getPostsByStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Temporary diagnostic endpoint — reports what THIS deployment actually sees.
 * Runs all query shapes in a single invocation so results can't be split
 * across instances. Remove once the pending-posts mystery is solved.
 */
export async function GET() {
  const url = process.env.DATABASE_URL || "";
  let dbHost = "unset";
  try {
    dbHost = new URL(url).host;
  } catch {
    dbHost = "unparseable";
  }

  const out: Record<string, unknown> = { dbHost };

  try {
    const all = await getAllPosts();
    out.viaGetAllPosts = all.map((p) => `${p.id}:${p.status}`);
  } catch (e: any) {
    out.viaGetAllPosts = `ERROR: ${e.message}`;
  }

  try {
    const pending = await getPostsByStatus("pending");
    out.viaByStatusPending = pending.map((p) => `${p.id}:${p.status}`);
  } catch (e: any) {
    out.viaByStatusPending = `ERROR: ${e.message}`;
  }

  try {
    const rejected = await getPostsByStatus("rejected");
    out.viaByStatusRejected = rejected.map((p) => `${p.id}:${p.status}`);
  } catch (e: any) {
    out.viaByStatusRejected = `ERROR: ${e.message}`;
  }

  try {
    // Fresh client, bypassing lib/db's cached instance
    const freshSql = neon(url);
    const raw = await freshSql`SELECT id, status FROM posts ORDER BY id`;
    out.viaFreshClient = raw.map((p: any) => `${p.id}:${p.status}`);
  } catch (e: any) {
    out.viaFreshClient = `ERROR: ${e.message}`;
  }

  return NextResponse.json(out);
}
