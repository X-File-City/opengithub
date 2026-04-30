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
  const url = new URL(request.url);
  const refs = await getRepositoryRefsFromCookie(
    request.headers.get("cookie"),
    decodeURIComponent(owner),
    decodeURIComponent(repo),
    {
      query: url.searchParams.get("q") ?? undefined,
      currentPath: url.searchParams.get("currentPath") ?? undefined,
      activeRef: url.searchParams.get("activeRef") ?? undefined,
      page: Number(url.searchParams.get("page") ?? "1"),
      pageSize: Number(url.searchParams.get("pageSize") ?? "100"),
    },
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
