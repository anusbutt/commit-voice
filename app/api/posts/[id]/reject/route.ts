import { NextRequest, NextResponse } from "next/server";
import { getPostById, updatePostStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);

  try {
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== "pending") {
      return NextResponse.json({ error: `Post already ${post.status}` }, { status: 400 });
    }

    await updatePostStatus(id, "rejected");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
