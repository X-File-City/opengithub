import { type NextRequest, NextResponse } from "next/server";
import { type ApiErrorEnvelope, setRepositoryStarFromCookie } from "@/lib/api";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

async function updateStar(
  request: NextRequest,
  context: RouteContext,
  starred: boolean,
) {
  const { owner, repo } = await context.params;
  try {
    const social = await setRepositoryStarFromCookie(
      request.headers.get("cookie"),
      owner,
      repo,
      starred,
    );
    return NextResponse.json(social);
  } catch (error) {
    const envelope = (
      error instanceof Error ? error.cause : null
    ) as ApiErrorEnvelope | null;
    return NextResponse.json(
      envelope ?? {
        error: {
          code: "repository_star_failed",
          message: "Repository star update failed",
        },
        status: 502,
      },
      { status: envelope?.status ?? 502 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return updateStar(request, context, true);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return updateStar(request, context, false);
}
