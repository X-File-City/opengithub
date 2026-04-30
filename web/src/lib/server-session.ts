import { headers } from "next/headers";
import {
  type DashboardSummaryQuery,
  getAppShellContextFromCookie,
  getDashboardSummaryFromCookie,
  getRepositoryBlameFromCookie,
  getRepositoryBlobFromCookie,
  getRepositoryCommitHistoryFromCookie,
  getRepositoryCreationOptionsFromCookie,
  getRepositoryFileFinderFromCookie,
  getRepositoryFromCookie,
  getRepositoryImportFromCookie,
  getRepositoryPathFromCookie,
  getRepositoryRefsFromCookie,
  getSessionFromHeaders,
} from "@/lib/api";

export async function getSession() {
  return getSessionFromHeaders(await headers());
}

export async function getSessionAndShellContext() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");
  const [session, shellContext] = await Promise.all([
    getSessionFromHeaders(requestHeaders),
    getAppShellContextFromCookie(cookie),
  ]);

  return { session, shellContext };
}

export async function getAppShellContext() {
  const requestHeaders = await headers();
  return getAppShellContextFromCookie(requestHeaders.get("cookie"));
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
  options: { page?: number; pageSize?: number } = {},
) {
  const requestHeaders = await headers();
  return getRepositoryPathFromCookie(
    requestHeaders.get("cookie"),
    owner,
    repo,
    refName,
    path,
    options,
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

export async function getRepositoryBlame(
  owner: string,
  repo: string,
  refName: string,
  path: string,
) {
  const requestHeaders = await headers();
  return getRepositoryBlameFromCookie(
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

export async function getRepositoryRefs(owner: string, repo: string) {
  const requestHeaders = await headers();
  return getRepositoryRefsFromCookie(requestHeaders.get("cookie"), owner, repo);
}

export async function getRepositoryFileFinder(
  owner: string,
  repo: string,
  refName: string,
  query: string,
) {
  const requestHeaders = await headers();
  return getRepositoryFileFinderFromCookie(
    requestHeaders.get("cookie"),
    owner,
    repo,
    refName,
    query,
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
