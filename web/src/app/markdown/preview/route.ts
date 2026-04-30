import { NextResponse } from "next/server";
import { renderMarkdown } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rendered = await renderMarkdown({
      markdown: String(body.markdown ?? ""),
      repositoryId: body.repositoryId ?? null,
      owner: body.owner ?? null,
      repo: body.repo ?? null,
      ref: body.ref ?? null,
      enableTaskToggles: Boolean(body.enableTaskToggles),
    });

    return NextResponse.json(rendered);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "markdown_preview_failed",
          message: "Markdown preview could not be rendered",
        },
        status: 502,
      },
      { status: 502 },
    );
  }
}
