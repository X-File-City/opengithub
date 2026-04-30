import { apiBaseUrl } from "@/lib/api";

type BlobDownloadRouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
    ref: string;
    path?: string[];
  }>;
};

function encodedPath(parts: string[]) {
  return parts
    .map((part) => encodeURIComponent(decodeURIComponent(part)))
    .join("/");
}

export async function GET(
  request: Request,
  { params }: BlobDownloadRouteContext,
) {
  const { owner, repo, ref, path = [] } = await params;
  const filePath = encodedPath(path);
  if (!filePath) {
    return Response.json(
      {
        error: {
          code: "not_found",
          message: "A file path is required.",
        },
        status: 404,
      },
      { status: 404 },
    );
  }

  const response = await fetch(
    `${apiBaseUrl()}/api/repos/${encodeURIComponent(
      decodeURIComponent(owner),
    )}/${encodeURIComponent(decodeURIComponent(repo))}/blobs/${filePath}?ref=${encodeURIComponent(
      decodeURIComponent(ref),
    )}&download=1`,
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
    response.headers.get("content-type") ?? "application/octet-stream",
  );
  const contentDisposition = response.headers.get("content-disposition");
  if (contentDisposition) {
    headers.set("content-disposition", contentDisposition);
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
