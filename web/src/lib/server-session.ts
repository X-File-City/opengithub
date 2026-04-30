import { headers } from "next/headers";
import {
  getDashboardSummaryFromCookie,
  getSessionFromHeaders,
} from "@/lib/api";

export async function getSession() {
  return getSessionFromHeaders(await headers());
}

export async function getDashboardSummary() {
  const requestHeaders = await headers();
  return getDashboardSummaryFromCookie(requestHeaders.get("cookie"));
}
