import { NextResponse } from "next/server";
import { getRepositoryFileFinderFromCookie } from "@/lib/api";

type RepositoryFileFinderRouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: RepositoryFileFinderRouteContext,
) {
  const { owner, repo } = await params;
  const url = new URL(request.url);
  const refName = url.searchParams.get("ref") ?? "main";
  const query = url.searchParams.get("q") ?? "";
  const results = await getRepositoryFileFinderFromCookie(
    request.headers.get("cookie"),
    decodeURIComponent(owner),
    decodeURIComponent(repo),
    refName,
    query,
  );

  if (!results) {
    return NextResponse.json(
      {
        error: {
          code: "repository_unavailable",
          message: "Repository files could not be searched.",
        },
        status: 404,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(results);
}
