import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { logout } from "@/lib/api";

export async function GET(request: Request) {
  return signOut(request);
}

export async function POST(request: Request) {
  return signOut(request);
}

async function signOut(request: Request) {
  const requestHeaders = await headers();
  const expiredCookie = await logout(requestHeaders.get("cookie"));
  const response = NextResponse.redirect(new URL("/", request.url));

  if (expiredCookie) {
    response.headers.set("set-cookie", expiredCookie);
  }

  return response;
}
