import { NextRequest, NextResponse } from "next/server";
import { createLogoutResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return createLogoutResponse(baseUrl);
}
