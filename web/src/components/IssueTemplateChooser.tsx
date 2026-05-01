import Link from "next/link";
import type { IssueTemplate } from "@/lib/api";

type IssueTemplateChooserProps = {
  owner: string;
  repo: string;
  templates: IssueTemplate[];
  newIssueHref: string;
  cancelHref: string;
};

export function IssueTemplateChooser({
  owner,
  repo,
  templates,
  newIssueHref,
  cancelHref,
}: IssueTemplateChooserProps) {
  return (
    <section aria-labelledby="issue-template-title" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="t-label" style={{ color: "var(--accent)" }}>
            {owner}/{repo}
          </p>
          <h1 className="t-h1 mt-2" id="issue-template-title">
            Create new issue
          </h1>
          <p className="t-sm mt-2 max-w-2xl" style={{ color: "var(--ink-3)" }}>
            Choose a repository template or start with a blank issue.
          </p>
        </div>
        <Link className="btn" href={cancelHref}>
          Cancel
        </Link>
      </div>

      <div className="grid gap-3">
        {templates.map((template) => (
          <article className="card p-5" key={template.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="t-h3">{template.name}</h2>
                <p className="t-sm mt-2" style={{ color: "var(--ink-3)" }}>
                  {template.description ?? "Use this issue template."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {template.issueType ? (
                    <span className="chip soft">{template.issueType}</span>
                  ) : null}
                  {template.defaultLabelIds.length ? (
                    <span className="chip soft">
                      {template.defaultLabelIds.length} default label
                      {template.defaultLabelIds.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {template.defaultAssigneeUserIds.length ? (
                    <span className="chip soft">
                      {template.defaultAssigneeUserIds.length} assignee
                      {template.defaultAssigneeUserIds.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              </div>
              <Link
                className="btn primary"
                href={`${newIssueHref}?template=${encodeURIComponent(template.slug)}`}
              >
                Get started
              </Link>
            </div>
          </article>
        ))}

        <article className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="t-h3">Blank issue</h2>
              <p className="t-sm mt-2" style={{ color: "var(--ink-3)" }}>
                Open a clean Markdown composer without template defaults.
              </p>
            </div>
            <Link className="btn" href={`${newIssueHref}?template=blank`}>
              Open blank issue
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
