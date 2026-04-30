import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/server-session";

export default async function GetStartedPage() {
  const session = await getSession();

  return (
    <AppShell session={session}>
      <article className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm font-semibold text-[#59636e]">
          opengithub setup guide
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2328]">
          Get started with your first repository
        </h1>
        <div className="mt-5 space-y-4 text-sm leading-6 text-[#59636e]">
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
        <Link
          className="mt-6 inline-flex h-9 items-center rounded-md bg-[#1f883d] px-4 text-sm font-semibold text-white hover:bg-[#1a7f37]"
          href="/new"
        >
          Create repository
        </Link>
      </article>
    </AppShell>
  );
}
