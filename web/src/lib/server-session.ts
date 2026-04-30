import { headers } from "next/headers";
import {
  getDashboardSummaryFromCookie,
  getRepositoryFromCookie,
  getSessionFromHeaders,
} from "@/lib/api";

export async function getSession() {
  return getSessionFromHeaders(await headers());
}

export async function getDashboardSummary() {
  const requestHeaders = await headers();
  return getDashboardSummaryFromCookie(requestHeaders.get("cookie"));
}

export async function getRepository(owner: string, repo: string) {
  const requestHeaders = await headers();
  return getRepositoryFromCookie(requestHeaders.get("cookie"), owner, repo);
}
