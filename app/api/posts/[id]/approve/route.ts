import { NextRequest, NextResponse } from "next/server";
import { getPostById, updatePostStatus } from "@/lib/db";
import { postToTwitter, postToLinkedin } from "@/lib/social";

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

    let error: string | undefined;

    if (post.platform === "twitter" || post.platform === "both") {
      const result = await postToTwitter(post.content);
      if (!result.success) error = result.error;
    }

    if (!error && (post.platform === "linkedin" || post.platform === "both")) {
      const result = await postToLinkedin(post.content);
      if (!result.success) error = result.error;
    }

    if (error) {
      await updatePostStatus(id, "rejected", error);
      return NextResponse.json({ success: false, error }, { status: 502 });
    }

    await updatePostStatus(id, "posted");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
