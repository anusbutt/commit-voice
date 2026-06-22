import { NextRequest, NextResponse } from "next/server";
import { getAllPosts, getPostsByStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const posts = status ? await getPostsByStatus(status) : await getAllPosts();
    return NextResponse.json(posts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
