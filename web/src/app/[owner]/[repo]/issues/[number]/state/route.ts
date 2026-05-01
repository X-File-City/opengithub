import { type NextRequest, NextResponse } from "next/server";
import {
  type ApiErrorEnvelope,
  type IssueState,
  updateRepositoryIssueStateFromCookie,
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
  const state =
    typeof body === "object" && body !== null && "state" in body
      ? String(body.state)
      : "";

  if (state !== "open" && state !== "closed") {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "state must be open or closed",
        },
        status: 422,
      },
      { status: 422 },
    );
  }

  try {
    const issue = await updateRepositoryIssueStateFromCookie(
      request.headers.get("cookie"),
      decodeURIComponent(owner),
      decodeURIComponent(repo),
      decodeURIComponent(number),
      state as IssueState,
    );
    return NextResponse.json(issue);
  } catch (error) {
    const envelope = (
      error instanceof Error ? error.cause : null
    ) as ApiErrorEnvelope | null;
    return NextResponse.json(
      envelope ?? {
        error: {
          code: "issue_state_failed",
          message: "Issue state could not be updated.",
        },
        status: 500,
      },
      { status: envelope?.status ?? 500 },
    );
  }
}
