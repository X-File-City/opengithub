import { headers } from "next/headers";
import {
  type DashboardSummaryQuery,
  getDashboardSummaryFromCookie,
  getRepositoryBlobFromCookie,
  getRepositoryCommitHistoryFromCookie,
  getRepositoryCreationOptionsFromCookie,
  getRepositoryFromCookie,
  getRepositoryImportFromCookie,
  getRepositoryPathFromCookie,
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

export async function getRepositoryPath(
  owner: string,
  repo: string,
  refName: string,
  path: string,
) {
  const requestHeaders = await headers();
  return getRepositoryPathFromCookie(
    requestHeaders.get("cookie"),
    owner,
    repo,
    refName,
    path,
  );
}

export async function getRepositoryBlob(
  owner: string,
  repo: string,
  refName: string,
  path: string,
) {
  const requestHeaders = await headers();
  return getRepositoryBlobFromCookie(
    requestHeaders.get("cookie"),
    owner,
    repo,
    refName,
    path,
  );
}

export async function getRepositoryCommitHistory(
  owner: string,
  repo: string,
  refName: string,
  path: string,
) {
  const requestHeaders = await headers();
  return getRepositoryCommitHistoryFromCookie(
    requestHeaders.get("cookie"),
    owner,
    repo,
    refName,
    path,
  );
}

export async function getRepositoryCreationOptions() {
  const requestHeaders = await headers();
  return getRepositoryCreationOptionsFromCookie(requestHeaders.get("cookie"));
}

export async function getRepositoryImport(importId: string) {
  const requestHeaders = await headers();
  return getRepositoryImportFromCookie(requestHeaders.get("cookie"), importId);
}
