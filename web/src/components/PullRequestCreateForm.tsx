"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import type {
  ApiErrorEnvelope,
  PullRequestCompareView,
  PullRequestCreateOptions,
} from "@/lib/api";

type PullRequestCreateFormProps = {
  owner: string;
  repo: string;
  compare: PullRequestCompareView;
};

function includesId(items: string[], id: string) {
  return items.includes(id);
}

function toggleId(items: string[], id: string) {
  return includesId(items, id)
    ? items.filter((item) => item !== id)
    : [...items, id];
}

function firstTemplateBody(options: PullRequestCreateOptions) {
  return options.templates[0]?.body ?? "";
}

export function PullRequestCreateForm({
  owner,
  repo,
  compare,
}: PullRequestCreateFormProps) {
  const router = useRouter();
  const options = compare.createOptions;
  const [title, setTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(
    options.templates[0]?.slug ?? "",
  );
  const [body, setBody] = useState(firstTemplateBody(options));
  const [isDraft, setIsDraft] = useState(false);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>([]);
  const [reviewerUserIds, setReviewerUserIds] = useState<string[]>([]);
  const [milestoneId, setMilestoneId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedTemplateName = useMemo(
    () =>
      options.templates.find((template) => template.slug === selectedTemplate)
        ?.name ?? "Blank description",
    [options.templates, selectedTemplate],
  );

  function chooseTemplate(slug: string) {
    setSelectedTemplate(slug);
    const template = options.templates.find((item) => item.slug === slug);
    setBody(template?.body ?? "");
  }

  async function submit() {
    if (!title.trim()) {
      setFeedback("Add a pull request title before creating it.");
      return;
    }
    setIsSubmitting(true);
    setFeedback("Creating pull request...");
    try {
      const response = await fetch(`/${owner}/${repo}/pulls/create`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          baseRef: compare.base.shortName,
          headRef: compare.head.shortName,
          isDraft,
          templateSlug: selectedTemplate || null,
          labelIds,
          assigneeUserIds,
          reviewerUserIds,
          milestoneId: milestoneId || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const envelope = payload as ApiErrorEnvelope | null;
        throw new Error(
          envelope?.error.message ?? "Pull request could not be created.",
        );
      }
      const href = (payload as { href?: string } | null)?.href;
      if (!href) {
        throw new Error("Pull request was created without a detail link.");
      }
      setFeedback("Pull request created. Opening detail page...");
      router.push(href);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Pull request could not be created.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="create-pr-title">
      <div
        className="border-b p-4"
        style={{
          borderColor: "var(--line)",
          background: "var(--surface-2)",
        }}
      >
        <div className="t-label" style={{ color: "var(--ink-3)" }}>
          Open a pull request
        </div>
        <h2 className="t-h2 mt-1" id="create-pr-title">
          Create pull request
        </h2>
        <p className="t-sm mt-2" style={{ color: "var(--ink-3)" }}>
          Merge <span className="t-mono-sm">{compare.head.shortName}</span> into{" "}
          <span className="t-mono-sm">{compare.base.shortName}</span>.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-0 max-lg:grid-cols-1">
        <div className="space-y-4 p-4">
          <div>
            <label className="t-label" htmlFor="pull-request-title">
              Title
            </label>
            <input
              className="input mt-2 h-11 w-full px-3"
              id="pull-request-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Briefly describe these changes"
              value={title}
            />
          </div>

          <div>
            <label className="t-label" htmlFor="pull-request-template">
              Template
            </label>
            <select
              className="input mt-2 h-11 w-full px-3"
              id="pull-request-template"
              onChange={(event) => chooseTemplate(event.target.value)}
              value={selectedTemplate}
            >
              <option value="">Blank description</option>
              {options.templates.map((template) => (
                <option key={template.slug} value={template.slug}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="t-xs mt-2" style={{ color: "var(--ink-3)" }}>
              {selectedTemplateName}
            </p>
          </div>

          <MarkdownEditor
            key={selectedTemplate}
            initialMarkdown={body}
            initialRendered={{ cached: false, contentSha: "", html: "" }}
            onMarkdownChange={setBody}
            owner={owner}
            refName={compare.head.shortName}
            repo={repo}
          />

          <label className="flex items-center gap-3 t-sm">
            <input
              checked={isDraft}
              onChange={(event) => setIsDraft(event.target.checked)}
              type="checkbox"
            />
            Mark as draft
          </label>

          {feedback ? (
            <p
              className="t-sm"
              role={
                feedback.includes("could not") || feedback.includes("Add ")
                  ? "alert"
                  : "status"
              }
              style={{
                color:
                  feedback.includes("could not") || feedback.includes("Add ")
                    ? "var(--err)"
                    : "var(--ink-3)",
              }}
            >
              {feedback}
            </p>
          ) : null}

          <button
            className="btn accent"
            disabled={isSubmitting}
            onClick={submit}
            type="button"
          >
            {isSubmitting ? "Creating..." : "Create pull request"}
          </button>
        </div>

        <aside
          className="space-y-6 border-l p-4 max-lg:border-l-0 max-lg:border-t"
          style={{ borderColor: "var(--line)" }}
        >
          <MetadataGroup title="Reviewers">
            {options.users.map((user) => (
              <label className="flex items-center gap-2 t-sm" key={user.id}>
                <input
                  checked={includesId(reviewerUserIds, user.id)}
                  onChange={() =>
                    setReviewerUserIds((current) => toggleId(current, user.id))
                  }
                  type="checkbox"
                />
                <span className="av sm">
                  {user.login.slice(0, 1).toUpperCase()}
                </span>
                {user.login}
              </label>
            ))}
          </MetadataGroup>

          <MetadataGroup title="Assignees">
            {options.users.map((user) => (
              <label className="flex items-center gap-2 t-sm" key={user.id}>
                <input
                  checked={includesId(assigneeUserIds, user.id)}
                  onChange={() =>
                    setAssigneeUserIds((current) => toggleId(current, user.id))
                  }
                  type="checkbox"
                />
                <span className="av sm">
                  {user.login.slice(0, 1).toUpperCase()}
                </span>
                {user.login}
              </label>
            ))}
          </MetadataGroup>

          <MetadataGroup title="Labels">
            {options.labels.map((label) => (
              <label className="flex items-center gap-2 t-sm" key={label.id}>
                <input
                  checked={includesId(labelIds, label.id)}
                  onChange={() =>
                    setLabelIds((current) => toggleId(current, label.id))
                  }
                  type="checkbox"
                />
                <span className="chip soft">{label.name}</span>
              </label>
            ))}
          </MetadataGroup>

          <div>
            <label className="t-label" htmlFor="pull-request-milestone">
              Milestone
            </label>
            <select
              className="input mt-2 h-10 w-full px-3"
              id="pull-request-milestone"
              onChange={(event) => setMilestoneId(event.target.value)}
              value={milestoneId}
            >
              <option value="">No milestone</option>
              {options.milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.title}
                </option>
              ))}
            </select>
          </div>
        </aside>
      </div>
    </section>
  );
}

function MetadataGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="t-label">{title}</h3>
      <div className="mt-2 space-y-2">
        {children || (
          <p className="t-sm" style={{ color: "var(--ink-3)" }}>
            Nothing available
          </p>
        )}
      </div>
    </div>
  );
}
