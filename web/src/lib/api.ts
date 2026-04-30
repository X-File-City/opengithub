import { headers } from "next/headers";

export type AuthUser = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type AuthSession = {
  authenticated: boolean;
  user: AuthUser | null;
};

const DEFAULT_API_URL = "http://localhost:3016";

export function apiBaseUrl(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    DEFAULT_API_URL
  ).replace(/\/$/, "");
}

export function sanitizeNextPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    !candidate?.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.includes("\n") ||
    candidate.includes("\r")
  ) {
    return "/dashboard";
  }
  return candidate;
}

export function googleStartUrl(nextPath: string): string {
  const url = new URL("/api/auth/google/start", apiBaseUrl());
  url.searchParams.set("next", sanitizeNextPath(nextPath));
  return url.toString();
}

export async function getSession(): Promise<AuthSession> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");
  const response = await fetch(`${apiBaseUrl()}/api/auth/me`, {
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    return { authenticated: false, user: null };
  }

  return (await response.json()) as AuthSession;
}

export async function logout(cookie: string | null): Promise<string | null> {
  const response = await fetch(`${apiBaseUrl()}/api/auth/logout`, {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });

  return response.headers.get("set-cookie");
}
