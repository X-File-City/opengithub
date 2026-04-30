import { type NextRequest, NextResponse } from "next/server";
import { type ApiErrorEnvelope, setRepositoryWatchFromCookie } from "@/lib/api";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

async function updateWatch(
  request: NextRequest,
  context: RouteContext,
  watching: boolean,
) {
  const { owner, repo } = await context.params;
  try {
    const social = await setRepositoryWatchFromCookie(
      request.headers.get("cookie"),
      owner,
      repo,
      watching,
    );
    return NextResponse.json(social);
  } catch (error) {
    const envelope = (
      error instanceof Error ? error.cause : null
    ) as ApiErrorEnvelope | null;
    return NextResponse.json(
      envelope ?? {
        error: {
          code: "repository_watch_failed",
          message: "Repository watch update failed",
        },
        status: 502,
      },
      { status: envelope?.status ?? 502 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return updateWatch(request, context, true);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return updateWatch(request, context, false);
}
