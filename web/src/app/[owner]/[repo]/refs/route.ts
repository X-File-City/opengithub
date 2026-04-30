import { NextResponse } from "next/server";
import { getRepositoryRefsFromCookie } from "@/lib/api";

type RepositoryRefsRouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: RepositoryRefsRouteContext,
) {
  const { owner, repo } = await params;
  const refs = await getRepositoryRefsFromCookie(
    request.headers.get("cookie"),
    decodeURIComponent(owner),
    decodeURIComponent(repo),
  );

  if (!refs) {
    return NextResponse.json(
      {
        error: {
          code: "repository_unavailable",
          message: "Repository refs could not be loaded.",
        },
        status: 404,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(refs);
}
