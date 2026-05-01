import { type NextRequest, NextResponse } from "next/server";
import {
  type ApiErrorEnvelope,
  updateRepositoryPullRequestReviewRequestsFromCookie,
} from "@/lib/api";

type RouteContext = {
  params: Promise<{ owner: string; repo: string; number: string }>;
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { owner, repo, number } = await context.params;
  const body = await request.json().catch(() => null);
  try {
    const pullRequest =
      await updateRepositoryPullRequestReviewRequestsFromCookie(
        request.headers.get("cookie"),
        decodeURIComponent(owner),
        decodeURIComponent(repo),
        decodeURIComponent(number),
        typeof body === "object" && body !== null
          ? stringArray(body.reviewerUserIds)
          : [],
      );
    return NextResponse.json(pullRequest);
  } catch (error) {
    const envelope = (
      error instanceof Error ? error.cause : null
    ) as ApiErrorEnvelope | null;
    return NextResponse.json(
      envelope ?? {
        error: {
          code: "review_requests_failed",
          message: "Review requests could not be updated.",
        },
        status: 500,
      },
      { status: envelope?.status ?? 500 },
    );
  }
}
