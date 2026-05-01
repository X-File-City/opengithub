import { type NextRequest, NextResponse } from "next/server";
import {
  type ApiErrorEnvelope,
  createRepositoryPullRequestCommentFromCookie,
} from "@/lib/api";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

function validationError(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "validation_failed",
        message,
      },
      status: 422,
      details: {
        field: "body",
        reason: message,
      },
    },
    { status: 422 },
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { owner, repo, number } = await context.params;
  const body = await request.json().catch(() => null);
  const commentBody =
    typeof body === "object" && body !== null && "body" in body
      ? String(body.body ?? "").trim()
      : "";

  if (!commentBody) {
    return validationError("comment body is required");
  }

  try {
    const item = await createRepositoryPullRequestCommentFromCookie(
      request.headers.get("cookie"),
      decodeURIComponent(owner),
      decodeURIComponent(repo),
      decodeURIComponent(number),
      commentBody,
    );
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    const envelope = (
      error instanceof Error ? error.cause : null
    ) as ApiErrorEnvelope | null;
    return NextResponse.json(
      envelope ?? {
        error: {
          code: "comment_create_failed",
          message: "Comment could not be posted.",
        },
        status: 500,
      },
      { status: envelope?.status ?? 500 },
    );
  }
}
