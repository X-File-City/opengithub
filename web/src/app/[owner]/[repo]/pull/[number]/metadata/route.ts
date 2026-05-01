import { type NextRequest, NextResponse } from "next/server";
import {
  type ApiErrorEnvelope,
  updateRepositoryPullRequestMetadataFromCookie,
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
  const milestoneId =
    typeof body === "object" &&
    body !== null &&
    "milestoneId" in body &&
    typeof body.milestoneId === "string" &&
    body.milestoneId
      ? body.milestoneId
      : null;

  try {
    const pullRequest = await updateRepositoryPullRequestMetadataFromCookie(
      request.headers.get("cookie"),
      decodeURIComponent(owner),
      decodeURIComponent(repo),
      decodeURIComponent(number),
      {
        labelIds:
          typeof body === "object" && body !== null
            ? stringArray(body.labelIds)
            : [],
        assigneeUserIds:
          typeof body === "object" && body !== null
            ? stringArray(body.assigneeUserIds)
            : [],
        milestoneId,
      },
    );
    return NextResponse.json(pullRequest);
  } catch (error) {
    const envelope = (
      error instanceof Error ? error.cause : null
    ) as ApiErrorEnvelope | null;
    return NextResponse.json(
      envelope ?? {
        error: {
          code: "pull_metadata_failed",
          message: "Pull request metadata could not be updated.",
        },
        status: 500,
      },
      { status: envelope?.status ?? 500 },
    );
  }
}
