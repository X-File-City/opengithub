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
      <aside
        className="lg:pr-6"
        style={{ borderRight: "1px solid var(--line)" }}
      >
        <nav aria-label="Settings navigation" className="space-y-1 t-sm">
          <Link
            className="block rounded-md px-3 py-2 font-medium hover:bg-[var(--hover)]"
            style={{ color: "var(--ink-3)" }}
            href="/settings/profile"
          >
            Profile
          </Link>
          <Link
            aria-current="page"
            className="block rounded-md px-3 py-2 font-semibold"
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--ink-1)",
            }}
            href="/settings/tokens"
          >
            Personal access tokens
          </Link>
        </nav>
      </aside>

      <div className="min-w-0">
        <div className="pb-5" style={{ borderBottom: "1px solid var(--line)" }}>
          <p className="t-label" style={{ color: "var(--ink-3)" }}>
            Developer settings
          </p>
          <h1 className="mt-2 t-h2">Personal access tokens</h1>
          <p
            className="mt-3 max-w-3xl t-body"
            style={{ color: "var(--ink-3)" }}
          >
            Use opengithub personal access tokens as command-line credentials
            for Git over HTTPS, REST API calls, and automation. Tokens are
            stored hashed by the Rust API and are shown only once when the token
            creation surface ships.
          </p>
        </div>

        <section className="mt-6 card">
          <div
            className="p-4"
            style={{ borderBottom: "1px solid var(--line)" }}
          >
            <h2 className="t-h3">Token quickstart</h2>
            <p className="mt-2 t-body" style={{ color: "var(--ink-3)" }}>
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
          <div className="card p-4">
            <h2 className="t-h3">Recommended scopes</h2>
            <dl className="mt-3 space-y-3 t-sm">
              {scopes.map(([scope, description]) => (
                <div key={scope}>
                  <dt
                    className="t-mono-sm font-semibold"
                    style={{ color: "var(--ink-1)" }}
                  >
                    {scope}
                  </dt>
                  <dd
                    className="mt-1 leading-6"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card p-4">
            <h2 className="t-h3">Developer references</h2>
            <div className="mt-3 grid gap-2 t-sm">
              <Link
                className="rounded-md px-3 py-2 font-semibold hover:bg-[var(--hover)]"
                style={{
                  border: "1px solid var(--line)",
                  color: "var(--accent)",
                }}
                href="/docs/git"
              >
                Git over HTTPS guide
              </Link>
              <Link
                className="rounded-md px-3 py-2 font-semibold hover:bg-[var(--hover)]"
                style={{
                  border: "1px solid var(--line)",
                  color: "var(--accent)",
                }}
                href="/docs/api"
              >
                REST API endpoint catalog
              </Link>
              <Link
                className="rounded-md px-3 py-2 font-semibold hover:bg-[var(--hover)]"
                style={{
                  border: "1px solid var(--line)",
                  color: "var(--accent)",
                }}
                href="/docs/get-started"
              >
                Setup guide
              </Link>
            </div>
            <p
              className="mt-4 t-sm leading-6"
              style={{ color: "var(--ink-3)" }}
            >
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
