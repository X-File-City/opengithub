import { apiBaseUrl } from "@/lib/api";

type ArchiveRouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
    branchZip: string[];
  }>;
};

function encodedBranch(parts: string[]) {
  return parts
    .map((part) => encodeURIComponent(decodeURIComponent(part)))
    .join("/");
}

export async function GET(request: Request, { params }: ArchiveRouteContext) {
  const { owner, repo, branchZip } = await params;
  const branch = encodedBranch(branchZip);
  if (!branch.endsWith(".zip")) {
    return Response.json(
      {
        error: {
          code: "not_found",
          message: "A zip archive path is required.",
        },
        status: 404,
      },
      { status: 404 },
    );
  }

  const response = await fetch(
    `${apiBaseUrl()}/${encodeURIComponent(
      decodeURIComponent(owner),
    )}/${encodeURIComponent(decodeURIComponent(repo))}/archive/refs/heads/${branch}`,
    {
      headers: request.headers.get("cookie")
        ? { cookie: request.headers.get("cookie") as string }
        : undefined,
      cache: "no-store",
    },
  );

  const headers = new Headers();
  headers.set(
    "content-type",
    response.headers.get("content-type") ?? "application/zip",
  );
  const contentDisposition = response.headers.get("content-disposition");
  if (contentDisposition) {
    headers.set("content-disposition", contentDisposition);
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    headers.set("content-length", contentLength);
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
