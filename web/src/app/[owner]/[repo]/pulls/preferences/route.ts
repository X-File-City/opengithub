import { type NextRequest, NextResponse } from "next/server";
import { saveRepositoryPullPreferences } from "@/lib/api";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { owner, repo } = await context.params;
  const body = await request.json().catch(() => null);

  if (
    typeof body !== "object" ||
    body === null ||
    typeof body.dismissedContributorBanner !== "boolean"
  ) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "dismissedContributorBanner must be a boolean",
        },
        status: 422,
      },
      { status: 422 },
    );
  }

  try {
    const preferences = await saveRepositoryPullPreferences(
      request.headers.get("cookie"),
      decodeURIComponent(owner),
      decodeURIComponent(repo),
      { dismissedContributorBanner: body.dismissedContributorBanner },
    );
    return NextResponse.json(preferences);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "preferences_failed",
          message: "Pull request preferences could not be saved.",
        },
        status: 502,
      },
      { status: 502 },
    );
  }
}
