import { headers } from "next/headers";
import {
  type DashboardSummaryQuery,
  getDashboardSummaryFromCookie,
  getRepositoryCreationOptionsFromCookie,
  getRepositoryFromCookie,
  getRepositoryImportFromCookie,
  getSessionFromHeaders,
} from "@/lib/api";

export async function getSession() {
  return getSessionFromHeaders(await headers());
}

export async function getDashboardSummary(query: DashboardSummaryQuery = {}) {
  const requestHeaders = await headers();
  return getDashboardSummaryFromCookie(requestHeaders.get("cookie"), query);
}

export async function getRepository(owner: string, repo: string) {
  const requestHeaders = await headers();
  return getRepositoryFromCookie(requestHeaders.get("cookie"), owner, repo);
}

export async function getRepositoryCreationOptions() {
  const requestHeaders = await headers();
  return getRepositoryCreationOptionsFromCookie(requestHeaders.get("cookie"));
}

export async function getRepositoryImport(importId: string) {
  const requestHeaders = await headers();
  return getRepositoryImportFromCookie(requestHeaders.get("cookie"), importId);
}
