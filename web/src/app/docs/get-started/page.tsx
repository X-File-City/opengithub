import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/server-session";

export default async function GetStartedPage() {
  const session = await getSession();

  return (
    <AppShell session={session}>
      <article className="mx-auto max-w-3xl px-6 py-8">
        <p className="t-label" style={{ color: "var(--ink-3)" }}>
          opengithub setup guide
        </p>
        <h1 className="t-h1 mt-2" style={{ color: "var(--ink-1)" }}>
          Get started with your first repository
        </h1>
        <div
          className="mt-5 space-y-4 t-body"
          style={{ color: "var(--ink-3)" }}
        >
          <p>
            Create a repository, add collaborators, and use pull requests and
            issues to organize work. The local product API owns repository data,
            sessions, and permissions.
          </p>
          <ol className="list-inside list-decimal space-y-2">
            <li>
              Create a repository from the dashboard or new repository page.
            </li>
            <li>
              Clone it with the HTTPS remote shown on the repository page.
            </li>
            <li>
              Open issues and pull requests as collaboration features land.
            </li>
          </ol>
        </div>
        <Link className="btn primary mt-6" href="/new">
          Create repository
        </Link>
      </article>
    </AppShell>
  );
}
