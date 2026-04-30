import { type NextRequest, NextResponse } from "next/server";
import {
  type ApiErrorEnvelope,
  createRepositoryImportFromCookie,
  type RepositoryImportRequest,
} from "@/lib/api";

const OWNER_TYPES = new Set(["user", "organization"]);
const VISIBILITIES = new Set(["public", "private"]);

function validationError(message: string) {
  return NextResponse.json(
    {
      error: {
        code: "validation_failed",
        message,
      },
      status: 422,
    },
    { status: 422 },
  );
}

export async function POST(request: NextRequest) {
  let body: RepositoryImportRequest;
  try {
    body = (await request.json()) as RepositoryImportRequest;
  } catch {
    return validationError("Repository import payload must be valid JSON");
  }

  if (
    !body.sourceUrl?.trim() ||
    !OWNER_TYPES.has(body.ownerType) ||
    !body.ownerId ||
    !body.name?.trim()
  ) {
    return validationError(
      "Source URL, owner, and destination repository name are required",
    );
  }
  if (!VISIBILITIES.has(body.visibility)) {
    return validationError("Visibility must be public or private");
  }

  try {
    const repositoryImport = await createRepositoryImportFromCookie(
      request.headers.get("cookie"),
      body,
    );
    return NextResponse.json(repositoryImport, { status: 201 });
  } catch (error) {
    const envelope = (
      error instanceof Error ? error.cause : null
    ) as ApiErrorEnvelope | null;
    return NextResponse.json(
      envelope ?? {
        error: {
          code: "repository_import_failed",
          message: "Repository import could not start",
        },
        status: 502,
      },
      { status: envelope?.status ?? 502 },
    );
  }
}
