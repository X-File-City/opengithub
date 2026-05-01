import { type NextRequest, NextResponse } from "next/server";
import {
  type ApiErrorEnvelope,
  type CreatePullRequestRequest,
  createPullRequestFromCookie,
} from "@/lib/api";

type RouteContext = {
  params: Promise<{ owner: string; repo: string }>;
};

function validationError(message: string, field: string) {
  return NextResponse.json(
    {
      error: {
        code: "validation_failed",
        message,
      },
      status: 422,
      details: {
        field,
        reason: message,
      },
    },
    { status: 422 },
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { owner, repo } = await context.params;
  let body: CreatePullRequestRequest;

  try {
    body = (await request.json()) as CreatePullRequestRequest;
  } catch {
    return validationError("Pull request payload must be valid JSON", "body");
  }

  if (!body.title?.trim()) {
    return validationError("pull request title is required", "title");
  }
  if (!body.baseRef?.trim() || !body.headRef?.trim()) {
    return validationError("baseRef and headRef are required", "headRef");
  }

  try {
    const pullRequest = await createPullRequestFromCookie(
      request.headers.get("cookie"),
      owner,
      repo,
      {
        ...body,
        title: body.title.trim(),
        body: body.body?.trim() ? body.body : null,
      },
    );
    return NextResponse.json(pullRequest, { status: 201 });
  } catch (error) {
    const envelope = (
      error instanceof Error ? error.cause : null
    ) as ApiErrorEnvelope | null;
    return NextResponse.json(
      envelope ?? {
        error: {
          code: "pull_request_create_failed",
          message: "Pull request could not be created.",
        },
        status: 500,
      },
      { status: envelope?.status ?? 500 },
    );
  }
}
