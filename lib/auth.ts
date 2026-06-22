import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const AUTH_COOKIE = "commit_voice_auth";
const SESSION_VALUE = "authenticated";

/**
 * Verify the password against DASHBOARD_PASSWORD env var.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyPassword(password: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;

  const a = Buffer.from(password);
  const b = Buffer.from(expected);

  // Prevent timing attacks — always compare equal-length buffers
  if (a.length !== b.length) {
    // Still compare to avoid leaking length info, but with a dummy
    try {
      timingSafeEqual(b, b);
    } catch {
      // length mismatch on dummy, ignore
    }
    return false;
  }

  return timingSafeEqual(a, b);
}

/**
 * Check if the request has a valid auth cookie.
 */
export function isAuthenticated(request: NextRequest): boolean {
  const cookie = request.cookies.get(AUTH_COOKIE);
  return cookie?.value === SESSION_VALUE;
}

/**
 * Create a login response that sets the auth cookie.
 */
export function createLoginResponse(redirectTo: string, baseUrl: string): NextResponse {
  const redirectUrl = new URL(redirectTo, baseUrl);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(AUTH_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  return response;
}

/**
 * Create a logout response that clears the auth cookie.
 */
export function createLogoutResponse(baseUrl: string): NextResponse {
  const response = NextResponse.redirect(new URL("/login", baseUrl));
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
