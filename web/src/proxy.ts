import { type NextRequest, NextResponse } from "next/server";
import { getSessionFromHeaders } from "@/lib/api";
import { isProtectedPath, loginRedirectUrl } from "@/lib/protected-routes";

export async function proxy(request: NextRequest) {
  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const session = await getSessionFromHeaders(request.headers);

  if (!session.authenticated || !session.user) {
    return NextResponse.redirect(loginRedirectUrl(request));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/new/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/:owner/:repo/settings/:path*",
  ],
};
