import { apiBaseUrl } from "@/lib/api";

type BlobBytesRouteContext = {
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

export async function GET(request: Request, { params }: BlobBytesRouteContext) {
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
    `${apiBaseUrl()}/${encodeURIComponent(
      decodeURIComponent(owner),
    )}/${encodeURIComponent(decodeURIComponent(repo))}/raw/${encodeURIComponent(
      decodeURIComponent(ref),
    )}/${filePath}`,
    {
      headers: request.headers.get("cookie")
        ? { cookie: request.headers.get("cookie") as string }
        : undefined,
      cache: "no-store",
    },
  );

  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "text/plain; charset=utf-8",
    },
  });
}
