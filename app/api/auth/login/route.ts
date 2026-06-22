import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createLoginResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, redirect } = body;

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return createLoginResponse(redirect || "/dashboard", baseUrl);
  } catch (err: any) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
