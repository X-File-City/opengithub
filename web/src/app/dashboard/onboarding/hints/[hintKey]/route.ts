import { type NextRequest, NextResponse } from "next/server";
import { apiBaseUrl } from "@/lib/api";

type RouteContext = {
  params: Promise<{
    hintKey: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { hintKey } = await context.params;
  const response = await fetch(
    `${apiBaseUrl()}/api/dashboard/onboarding/hints/${encodeURIComponent(
      hintKey,
    )}`,
    {
      method: "POST",
      headers: request.headers.get("cookie")
        ? { cookie: request.headers.get("cookie") ?? "" }
        : undefined,
      cache: "no-store",
    },
  );

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}
