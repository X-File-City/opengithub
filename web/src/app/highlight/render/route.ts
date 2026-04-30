import { apiBaseUrl } from "@/lib/api";

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(`${apiBaseUrl()}/api/highlight/render`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      source: body.source ?? "",
      path: body.path ?? null,
      sha: body.sha ?? null,
      repositoryId: body.repositoryId ?? null,
      language: body.language ?? null,
    }),
    cache: "no-store",
  });

  const payload = await response.text();
  return new Response(payload, {
    status: response.status,
    headers: { "content-type": "application/json" },
  });
}
