import Link from "next/link";
import { DeveloperCommandBlock } from "@/components/DeveloperCommandBlock";

const apiUserExample = `curl -H "Authorization: Bearer <opengithub_pat>" \\
  https://opengithub.namuh.co/api/user`;

const repoListExample = `curl -H "Authorization: Bearer <opengithub_pat>" \\
  "https://opengithub.namuh.co/api/repos?page=1&pageSize=30"`;

const gitCloneExample = `git clone https://mona:<opengithub_pat>@opengithub.namuh.co/mona/octo-app.git`;

const pushExample = `git remote add origin https://opengithub.namuh.co/mona/octo-app.git
git branch -M main
git push -u origin main`;

const scopes = [
  ["repo:read", "Clone, fetch, and read repository metadata."],
  ["repo:write", "Push over HTTPS and mutate repository resources."],
  ["api:read", "Read REST resources through the opengithub API."],
  ["api:write", "Create and update REST resources where permitted."],
];

export function DeveloperTokensPage() {
  return (
    <article className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr]">
      <aside className="lg:border-r lg:border-[#d0d7de] lg:pr-6">
        <nav aria-label="Settings navigation" className="space-y-1 text-sm">
          <Link
            className="block rounded-md px-3 py-2 font-medium text-[#59636e] hover:bg-[#f6f8fa]"
            href="/settings/profile"
          >
            Profile
          </Link>
          <Link
            aria-current="page"
            className="block rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 py-2 font-semibold text-[#1f2328]"
            href="/settings/tokens"
          >
            Personal access tokens
          </Link>
        </nav>
      </aside>

      <div className="min-w-0">
        <div className="border-b border-[#d0d7de] pb-5">
          <p className="text-sm font-semibold text-[#59636e]">
            Developer settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2328]">
            Personal access tokens
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#59636e]">
            Use opengithub personal access tokens as command-line credentials
            for Git over HTTPS, REST API calls, and automation. Tokens are
            stored hashed by the Rust API and are shown only once when the token
            creation surface ships.
          </p>
        </div>

        <section className="mt-6 rounded-md border border-[#d0d7de] bg-white">
          <div className="border-b border-[#d0d7de] p-4">
            <h2 className="text-base font-semibold text-[#1f2328]">
              Token quickstart
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#59636e]">
              The examples below use opengithub-owned endpoints and the same
              token contract used by Git transport and REST automation.
            </p>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <DeveloperCommandBlock
              copyLabel="Copy API curl"
              label="Current user"
              value={apiUserExample}
            />
            <DeveloperCommandBlock
              copyLabel="Copy repo curl"
              label="List repositories"
              value={repoListExample}
            />
            <DeveloperCommandBlock
              copyLabel="Copy clone"
              label="Clone with token"
              value={gitCloneExample}
            />
            <DeveloperCommandBlock
              copyLabel="Copy push"
              label="Push workflow"
              value={pushExample}
            />
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-[#d0d7de] bg-white p-4">
            <h2 className="text-base font-semibold text-[#1f2328]">
              Recommended scopes
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              {scopes.map(([scope, description]) => (
                <div key={scope}>
                  <dt className="font-mono text-xs font-semibold text-[#1f2328]">
                    {scope}
                  </dt>
                  <dd className="mt-1 leading-6 text-[#59636e]">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-md border border-[#d0d7de] bg-white p-4">
            <h2 className="text-base font-semibold text-[#1f2328]">
              Developer references
            </h2>
            <div className="mt-3 grid gap-2 text-sm">
              <Link
                className="rounded-md border border-[#d0d7de] px-3 py-2 font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
                href="/docs/git"
              >
                Git over HTTPS guide
              </Link>
              <Link
                className="rounded-md border border-[#d0d7de] px-3 py-2 font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
                href="/docs/api"
              >
                REST API endpoint catalog
              </Link>
              <Link
                className="rounded-md border border-[#d0d7de] px-3 py-2 font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
                href="/docs/get-started"
              >
                Setup guide
              </Link>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#59636e]">
              Token creation and revocation are intentionally kept out of this
              read-only workflow page until the security settings feature owns
              the write API and audit events.
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}
