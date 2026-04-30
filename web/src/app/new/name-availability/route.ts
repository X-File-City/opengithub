import { type NextRequest, NextResponse } from "next/server";
import {
  getRepositoryNameAvailabilityFromCookie,
  type RepositoryOwnerType,
} from "@/lib/api";

const OWNER_TYPES = new Set(["user", "organization"]);

export async function GET(request: NextRequest) {
  const ownerType = request.nextUrl.searchParams.get("ownerType");
  const ownerId = request.nextUrl.searchParams.get("ownerId");
  const name = request.nextUrl.searchParams.get("name");

  if (!ownerType || !OWNER_TYPES.has(ownerType) || !ownerId || !name) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "ownerType, ownerId, and name are required",
        },
        status: 422,
      },
      { status: 422 },
    );
  }

  const availability = await getRepositoryNameAvailabilityFromCookie(
    request.headers.get("cookie"),
    {
      ownerType: ownerType as RepositoryOwnerType,
      ownerId,
      name,
    },
  );

  if (!availability) {
    return NextResponse.json(
      {
        error: {
          code: "availability_unavailable",
          message: "Repository name availability could not be checked",
        },
        status: 502,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(availability);
}
