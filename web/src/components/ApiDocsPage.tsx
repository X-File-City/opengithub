import Link from "next/link";
import {
  type ApiDocMethod,
  apiEndpointDocs,
  errorEnvelopeExample,
  paginationExample,
} from "@/lib/api-docs";

const methodClassName: Record<ApiDocMethod, string> = {
  GET: "border-[#54aeff] bg-[#ddf4ff] text-[#0969da]",
  POST: "border-[#4ac26b] bg-[#dafbe1] text-[#1a7f37]",
  PATCH: "border-[#d4a72c] bg-[#fff8c5] text-[#7d4e00]",
  DELETE: "border-[#ff8182] bg-[#ffebe9] text-[#cf222e]",
};

function CodeBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-semibold uppercase text-[#59636e]">
        {label}
      </p>
      <pre className="max-w-full overflow-x-auto rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-3 font-mono text-xs leading-5 text-[#1f2328]">
        {value}
      </pre>
    </div>
  );
}

export function ApiDocsPage() {
  return (
    <article className="mx-auto max-w-6xl overflow-x-hidden px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-6 border-b border-[#d0d7de] pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#59636e]">
            opengithub REST API
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[#1f2328]">
            Build against implemented opengithub APIs
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#59636e]">
            These endpoints are served by the Rust API and backed by
            opengithub-owned Postgres data. The catalog only lists APIs that are
            implemented in this build, with the same pagination and error
            envelopes used by the product UI.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-9 items-center rounded-md bg-[#1f883d] px-4 text-sm font-semibold text-white hover:bg-[#1a7f37]"
            href="/docs/git"
          >
            Git docs
          </Link>
          <Link
            className="inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
            href="/docs/get-started"
          >
            Setup guide
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-[#d0d7de] bg-white p-4">
          <h2 className="text-base font-semibold text-[#1f2328]">
            Authentication
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#59636e]">
            Browser clients use the signed opengithub session cookie created by
            Google OAuth. Personal access tokens are stored hashed and are
            reserved for Git, automation, and later token-management surfaces.
          </p>
        </div>
        <div className="rounded-md border border-[#d0d7de] bg-white p-4">
          <h2 className="text-base font-semibold text-[#1f2328]">
            Pagination and errors
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#59636e]">
            List endpoints accept page and pageSize and return
            items/total/page/pageSize. Failures use code/message envelopes with
            the matching HTTP status.
          </p>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="endpoint-catalog-heading">
        <h2
          id="endpoint-catalog-heading"
          className="text-lg font-semibold text-[#1f2328]"
        >
          Endpoint catalog
        </h2>
        <div className="mt-4 space-y-4">
          {apiEndpointDocs.map((endpoint) => (
            <section
              key={endpoint.id}
              className="rounded-md border border-[#d0d7de] bg-white p-4"
              aria-labelledby={`${endpoint.id}-heading`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-md border px-2 py-1 font-mono text-xs font-semibold ${methodClassName[endpoint.method]}`}
                    >
                      {endpoint.method}
                    </span>
                    <code className="break-all font-mono text-sm text-[#1f2328]">
                      {endpoint.path}
                    </code>
                  </div>
                  <h3
                    id={`${endpoint.id}-heading`}
                    className="mt-3 text-base font-semibold text-[#1f2328]"
                  >
                    {endpoint.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#59636e]">
                    {endpoint.description}
                  </p>
                </div>
                <p className="min-w-0 break-words rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 py-2 text-xs font-semibold text-[#59636e]">
                  {endpoint.auth}
                </p>
              </div>

              <details className="mt-4 rounded-md border border-[#d0d7de]">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]">
                  Request and response examples
                </summary>
                <div className="grid gap-4 border-t border-[#d0d7de] p-3 lg:grid-cols-2">
                  {endpoint.request ? (
                    <CodeBlock label="Request" value={endpoint.request} />
                  ) : (
                    <CodeBlock
                      label="Request"
                      value={`${endpoint.method} ${endpoint.path}`}
                    />
                  )}
                  <CodeBlock label="Response" value={endpoint.response} />
                </div>
              </details>

              <ul className="mt-3 list-inside list-disc space-y-1 text-sm leading-6 text-[#59636e]">
                {endpoint.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-[#d0d7de] bg-white p-4">
          <h2 className="text-base font-semibold text-[#1f2328]">
            Pagination example
          </h2>
          <div className="mt-3">
            <CodeBlock label="List envelope" value={paginationExample} />
          </div>
        </div>
        <div className="rounded-md border border-[#d0d7de] bg-white p-4">
          <h2 className="text-base font-semibold text-[#1f2328]">
            Error example
          </h2>
          <div className="mt-3">
            <CodeBlock label="Error envelope" value={errorEnvelopeExample} />
          </div>
        </div>
      </section>
    </article>
  );
}
