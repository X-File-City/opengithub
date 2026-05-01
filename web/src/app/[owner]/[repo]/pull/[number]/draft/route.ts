import { type NextRequest, NextResponse } from "next/server";
import {
  type ApiErrorEnvelope,
  updateRepositoryPullRequestDraftFromCookie,
} from "@/lib/api";

type RouteContext = {
  params: Promise<{ owner: string; repo: string; number: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { owner, repo, number } = await context.params;
  const body = await request.json().catch(() => null);
  const isDraft =
    typeof body === "object" && body !== null && "isDraft" in body
      ? Boolean(body.isDraft)
      : false;
  try {
    const pullRequest = await updateRepositoryPullRequestDraftFromCookie(
      request.headers.get("cookie"),
      decodeURIComponent(owner),
      decodeURIComponent(repo),
      decodeURIComponent(number),
      isDraft,
    );
    return NextResponse.json(pullRequest);
  } catch (error) {
    const envelope = (
      error instanceof Error ? error.cause : null
    ) as ApiErrorEnvelope | null;
    return NextResponse.json(
      envelope ?? {
        error: {
          code: "draft_state_failed",
          message: "Draft state could not be updated.",
        },
        status: 500,
      },
      { status: envelope?.status ?? 500 },
    );
  }
}
