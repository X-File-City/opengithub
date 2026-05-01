import { type NextRequest, NextResponse } from "next/server";
import {
  type ApiErrorEnvelope,
  type ReactionContent,
  toggleRepositoryIssueReactionFromCookie,
} from "@/lib/api";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
    number: string;
  }>;
};

const reactions = new Set<ReactionContent>([
  "thumbs_up",
  "thumbs_down",
  "laugh",
  "hooray",
  "confused",
  "heart",
  "rocket",
  "eyes",
]);

export async function POST(request: NextRequest, context: RouteContext) {
  const { owner, repo, number } = await context.params;
  const body = await request.json().catch(() => null);
  const content =
    typeof body === "object" && body !== null && "content" in body
      ? String(body.content)
      : "";

  if (!reactions.has(content as ReactionContent)) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "reaction is not supported",
        },
        status: 422,
      },
      { status: 422 },
    );
  }

  try {
    const summaries = await toggleRepositoryIssueReactionFromCookie(
      request.headers.get("cookie"),
      decodeURIComponent(owner),
      decodeURIComponent(repo),
      decodeURIComponent(number),
      content as ReactionContent,
    );
    return NextResponse.json(summaries, { status: 201 });
  } catch (error) {
    const envelope = (
      error instanceof Error ? error.cause : null
    ) as ApiErrorEnvelope | null;
    return NextResponse.json(
      envelope ?? {
        error: {
          code: "reaction_failed",
          message: "Reaction could not be updated.",
        },
        status: 500,
      },
      { status: envelope?.status ?? 500 },
    );
  }
}
