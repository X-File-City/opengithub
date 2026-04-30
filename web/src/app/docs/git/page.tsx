import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getSession } from "@/lib/server-session";

const publicRemote = "https://opengithub.namuh.co/mona/octo-app.git";
const rawUrl = "https://opengithub.namuh.co/mona/octo-app/raw/main/README.md";
const archiveUrl =
  "https://opengithub.namuh.co/mona/octo-app/archive/refs/heads/main.zip";

export default async function GitDocsPage() {
  const session = await getSession();

  return (
    <AppShell session={session}>
      <article className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm font-semibold text-[#59636e]">opengithub Git</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2328]">
          Work with repositories over HTTPS
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[#59636e]">
          opengithub serves smart HTTP Git endpoints from its own Rust API.
          Public repositories can be cloned anonymously. Private repositories
          require a signed browser session or a personal access token with
          repository scope.
        </p>

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-[#1f2328]">
            Clone and fetch
          </h2>
          <pre className="overflow-x-auto rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-4 font-mono text-xs leading-6 text-[#1f2328]">
            {`git clone ${publicRemote}
cd octo-app
git fetch origin main`}
          </pre>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-[#1f2328]">
            Push changes
          </h2>
          <pre className="overflow-x-auto rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-4 font-mono text-xs leading-6 text-[#1f2328]">
            {`git remote add origin ${publicRemote}
git branch -M main
git push -u origin main`}
          </pre>
          <p className="text-sm leading-6 text-[#59636e]">
            For private repositories or command-line pushes, use a personal
            access token as the HTTPS password. Tokens are stored hashed by the
            API and are never returned after creation.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-semibold text-[#1f2328]">
            Raw files and archives
          </h2>
          <pre className="overflow-x-auto rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-4 font-mono text-xs leading-6 text-[#1f2328]">
            {`curl -L ${rawUrl}
curl -L -o octo-app.zip ${archiveUrl}`}
          </pre>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="inline-flex h-9 items-center rounded-md bg-[#1f883d] px-4 text-sm font-semibold text-white hover:bg-[#1a7f37]"
            href="/new"
          >
            Create repository
          </Link>
          <Link
            className="inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
            href="/docs/get-started"
          >
            Setup guide
          </Link>
        </div>
      </article>
    </AppShell>
  );
}
