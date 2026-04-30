import { headers } from "next/headers";
import { getSessionFromHeaders } from "@/lib/api";

export async function getSession() {
  return getSessionFromHeaders(await headers());
}
