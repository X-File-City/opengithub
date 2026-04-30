import { type NextRequest, NextResponse } from "next/server";
import { getRepositoryImportFromCookie } from "@/lib/api";

type RouteParams = {
  params: Promise<{
    importId: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { importId } = await params;
  const repositoryImport = await getRepositoryImportFromCookie(
    request.headers.get("cookie"),
    importId,
  );

  if (!repositoryImport) {
    return NextResponse.json(
      {
        error: {
          code: "not_found",
          message: "Repository import was not found",
        },
        status: 404,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(repositoryImport);
}
