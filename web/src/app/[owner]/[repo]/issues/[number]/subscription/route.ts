import { type NextRequest, NextResponse } from "next/server";
import {
  type ApiErrorEnvelope,
  updateRepositoryIssueSubscriptionFromCookie,
} from "@/lib/api";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { owner, repo, number } = await context.params;
  const body = await request.json().catch(() => null);
  const subscribed =
    typeof body === "object" && body !== null && "subscribed" in body
      ? Boolean(body.subscribed)
      : false;

  try {
    const subscription = await updateRepositoryIssueSubscriptionFromCookie(
      request.headers.get("cookie"),
      decodeURIComponent(owner),
      decodeURIComponent(repo),
      decodeURIComponent(number),
      subscribed,
    );
    return NextResponse.json(subscription);
  } catch (error) {
    const envelope = (
      error instanceof Error ? error.cause : null
    ) as ApiErrorEnvelope | null;
    return NextResponse.json(
      envelope ?? {
        error: {
          code: "subscription_failed",
          message: "Notification subscription could not be updated.",
        },
        status: 500,
      },
      { status: envelope?.status ?? 500 },
    );
  }
}
