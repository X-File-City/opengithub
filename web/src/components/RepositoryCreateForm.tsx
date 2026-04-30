"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import type {
  RepositoryCreationOptions,
  RepositoryNameAvailability,
  RepositoryOwnerType,
  RepositoryVisibility,
} from "@/lib/api";

type RepositoryCreateFormProps = {
  options: RepositoryCreationOptions;
};

const VISIBILITY_COPY: Record<RepositoryVisibility, string> = {
  public: "Anyone on the internet can see this repository.",
  private: "You choose who can see and commit to this repository.",
  internal: "Organization members can see this repository.",
};

function normalizePreview(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).join("-");
}

function ownerKey(ownerType: RepositoryOwnerType, ownerId: string) {
  return `${ownerType}:${ownerId}`;
}

export function RepositoryCreateForm({ options }: RepositoryCreateFormProps) {
  const router = useRouter();
  const [selectedOwnerKey, setSelectedOwnerKey] = useState(() => {
    const firstOwner = options.owners[0];
    return firstOwner
      ? ownerKey(firstOwner.ownerType, firstOwner.id)
      : "user:missing";
  });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<RepositoryVisibility>("public");
  const [templateSlug, setTemplateSlug] = useState("blank");
  const [initializeReadme, setInitializeReadme] = useState(false);
  const [gitignoreSlug, setGitignoreSlug] = useState("");
  const [gitignoreSearch, setGitignoreSearch] = useState("");
  const [licenseSlug, setLicenseSlug] = useState("");
  const [availability, setAvailability] =
    useState<RepositoryNameAvailability | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<
    "idle" | "checking" | "error"
  >("idle");
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedOwner = useMemo(
    () =>
      options.owners.find(
        (owner) => ownerKey(owner.ownerType, owner.id) === selectedOwnerKey,
      ) ?? options.owners[0],
    [options.owners, selectedOwnerKey],
  );

  const normalizedName = normalizePreview(name);
  const filteredGitignoreTemplates = options.gitignoreTemplates.filter(
    (template) =>
      `${template.displayName} ${template.description}`
        .toLowerCase()
        .includes(gitignoreSearch.trim().toLowerCase()),
  );
  const selectedTemplate = options.templates.find(
    (template) => template.slug === templateSlug,
  );
  const selectedGitignore = options.gitignoreTemplates.find(
    (template) => template.slug === gitignoreSlug,
  );
  const selectedLicense = options.licenseTemplates.find(
    (template) => template.slug === licenseSlug,
  );

  async function checkAvailability(candidate = name) {
    if (!selectedOwner || !candidate.trim()) {
      setAvailability(null);
      return;
    }

    setAvailabilityStatus("checking");
    setAvailability(null);
    try {
      const params = new URLSearchParams({
        ownerType: selectedOwner.ownerType,
        ownerId: selectedOwner.id,
        name: candidate,
      });
      const response = await fetch(`/new/name-availability?${params}`);
      if (!response.ok) {
        throw new Error("availability failed");
      }
      setAvailability((await response.json()) as RepositoryNameAvailability);
      setAvailabilityStatus("idle");
    } catch {
      setAvailabilityStatus("error");
    }
  }

  async function submitRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);
    setFormError(null);

    if (!selectedOwner) {
      setFormError("Choose an owner before creating the repository.");
      return;
    }
    if (!normalizedName) {
      setNameError("Repository name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/new/repositories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerType: selectedOwner.ownerType,
          ownerId: selectedOwner.id,
          name,
          description,
          visibility,
          defaultBranch: "main",
          initializeReadme,
          templateSlug,
          gitignoreTemplateSlug: gitignoreSlug || null,
          licenseTemplateSlug: licenseSlug || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        const message =
          body?.error?.message ?? "Repository could not be created.";
        if (
          body?.error?.code === "conflict" ||
          body?.error?.code === "validation_failed"
        ) {
          setNameError(message);
        } else {
          setFormError(message);
        }
        setSubmitting(false);
        return;
      }

      router.push(body.href ?? `/${selectedOwner.login}/${normalizedName}`);
    } catch {
      setFormError("Repository could not be created. Try again.");
      setSubmitting(false);
    }
  }

  const createDisabled = submitting || !selectedOwner || !normalizedName;

  return (
    <form
      className="mx-auto max-w-[760px] px-4 py-7 sm:px-6"
      onSubmit={(event) => void submitRepository(event)}
    >
      <header className="border-b border-[#d0d7de] pb-5">
        <h1 className="text-2xl font-semibold tracking-normal text-[#1f2328]">
          Create a new repository
        </h1>
        <p className="mt-2 text-sm leading-5 text-[#59636e]">
          Repositories contain a project's files and version history. Have a
          project elsewhere?{" "}
          <Link className="text-[#0969da] hover:underline" href="/new/import">
            Import a repository.
          </Link>
        </p>
        <p className="mt-1 text-sm italic text-[#59636e]">
          Required fields are marked with an asterisk (*).
        </p>
      </header>

      <section className="grid grid-cols-[36px_1fr] gap-x-4 pt-6">
        <div className="flex flex-col items-center">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#afb8c1] text-sm font-semibold text-white">
            1
          </span>
          <span className="mt-2 flex-1 border-l border-[#d0d7de]" />
        </div>
        <div className="pb-7">
          <h2 className="text-base font-semibold text-[#1f2328]">General</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[140px_1fr]">
            <label className="block">
              <span className="text-sm font-semibold text-[#1f2328]">
                Owner *
              </span>
              <select
                className="mt-2 h-9 w-full rounded-md border border-[#d0d7de] bg-white px-3 text-sm"
                value={selectedOwnerKey}
                onChange={(event) => {
                  setSelectedOwnerKey(event.target.value);
                  setAvailability(null);
                }}
              >
                {options.owners.map((owner) => (
                  <option
                    key={ownerKey(owner.ownerType, owner.id)}
                    value={ownerKey(owner.ownerType, owner.id)}
                  >
                    {owner.login}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[#1f2328]">
                Repository name *
              </span>
              <input
                className="mt-2 h-9 w-full rounded-md border border-[#d0d7de] px-3 text-sm"
                value={name}
                onBlur={() => void checkAvailability()}
                onChange={(event) => {
                  setName(event.target.value);
                  setAvailability(null);
                  setNameError(null);
                }}
                required
              />
            </label>
          </div>
          <p className="mt-3 text-sm text-[#59636e]">
            Great repository names are short and memorable. How about{" "}
            <button
              className="font-medium text-[#1a7f37] hover:underline"
              type="button"
              onClick={() => {
                setName(options.suggestedName);
                void checkAvailability(options.suggestedName);
              }}
            >
              {options.suggestedName}
            </button>
            ?
          </p>
          {name.includes(" ") ? (
            <p className="mt-2 text-sm text-[#59636e]" role="status">
              This will be normalized to{" "}
              <span className="font-mono text-[#1f2328]">{normalizedName}</span>
              .
            </p>
          ) : null}
          {availabilityStatus === "checking" ? (
            <p className="mt-2 text-sm text-[#59636e]" role="status">
              Checking repository name...
            </p>
          ) : null}
          {availabilityStatus === "error" ? (
            <p className="mt-2 text-sm text-[#cf222e]" role="alert">
              Name availability could not be checked.
            </p>
          ) : null}
          {availability ? (
            <p
              className={`mt-2 text-sm ${
                availability.available ? "text-[#1a7f37]" : "text-[#cf222e]"
              }`}
              role={availability.available ? "status" : "alert"}
            >
              {availability.available
                ? `${availability.normalizedName} is available.`
                : availability.reason}
            </p>
          ) : null}
          {nameError ? (
            <p className="mt-2 text-sm text-[#cf222e]" role="alert">
              {nameError}
            </p>
          ) : null}
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-[#1f2328]">
              Description
            </span>
            <input
              className="mt-2 h-9 w-full rounded-md border border-[#d0d7de] px-3 text-sm"
              maxLength={350}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="mt-2 block text-xs text-[#59636e]">
              {description.length} / 350 characters
            </span>
          </label>
        </div>
      </section>

      <section className="grid grid-cols-[36px_1fr] gap-x-4">
        <div className="flex flex-col items-center">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#afb8c1] text-sm font-semibold text-white">
            2
          </span>
          <span className="mt-2 flex-1 border-l border-[#d0d7de]" />
        </div>
        <div className="pb-6">
          <h2 className="text-base font-semibold text-[#1f2328]">
            Configuration
          </h2>
          <div className="mt-4 divide-y divide-[#d0d7de] rounded-md border border-[#d0d7de] bg-white">
            <label className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block text-sm font-semibold text-[#1f2328]">
                  Choose visibility *
                </span>
                <span className="mt-1 block text-sm text-[#59636e]">
                  {VISIBILITY_COPY[visibility]}
                </span>
              </span>
              <select
                className="h-9 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold"
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value as RepositoryVisibility)
                }
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>

            <label className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block text-sm font-semibold text-[#1f2328]">
                  Start with a template
                </span>
                <span className="mt-1 block text-sm text-[#59636e]">
                  {selectedTemplate?.description ??
                    "Templates pre-configure your repository with files."}
                </span>
              </span>
              <select
                className="h-9 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold"
                value={templateSlug}
                onChange={(event) => setTemplateSlug(event.target.value)}
              >
                {options.templates.map((template) => (
                  <option key={template.slug} value={template.slug}>
                    {template.displayName}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center justify-between gap-4 p-4">
              <span>
                <span className="block text-sm font-semibold text-[#1f2328]">
                  Add README
                </span>
                <span className="mt-1 block text-sm text-[#59636e]">
                  READMEs can be used as longer descriptions.
                </span>
              </span>
              <button
                aria-pressed={initializeReadme}
                className={`h-8 min-w-16 rounded-md border px-3 text-sm font-semibold ${
                  initializeReadme
                    ? "border-[#1f883d] bg-[#dafbe1] text-[#116329]"
                    : "border-[#d0d7de] bg-[#f6f8fa] text-[#1f2328]"
                }`}
                type="button"
                onClick={() => setInitializeReadme((value) => !value)}
              >
                {initializeReadme ? "On" : "Off"}
              </button>
            </div>

            <details className="p-4">
              <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="block text-sm font-semibold text-[#1f2328]">
                    Add .gitignore
                  </span>
                  <span className="mt-1 block text-sm text-[#59636e]">
                    {selectedGitignore?.description ??
                      ".gitignore tells git which files not to track."}
                  </span>
                </span>
                <span className="inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold">
                  {selectedGitignore?.displayName ?? "No .gitignore"}
                </span>
              </summary>
              <div className="mt-4 rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-3">
                <label className="block text-sm font-semibold text-[#1f2328]">
                  Search gitignore templates
                  <input
                    className="mt-2 h-9 w-full rounded-md border border-[#d0d7de] bg-white px-3 text-sm"
                    value={gitignoreSearch}
                    onChange={(event) => setGitignoreSearch(event.target.value)}
                  />
                </label>
                <div className="mt-3 max-h-48 overflow-auto" role="listbox">
                  <button
                    className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-white"
                    type="button"
                    onClick={() => setGitignoreSlug("")}
                  >
                    No .gitignore
                  </button>
                  {filteredGitignoreTemplates.map((template) => (
                    <button
                      className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-white"
                      key={template.slug}
                      role="option"
                      type="button"
                      aria-selected={gitignoreSlug === template.slug}
                      onClick={() => setGitignoreSlug(template.slug)}
                    >
                      <span className="font-semibold">
                        {template.displayName}
                      </span>
                      <span className="block text-xs text-[#59636e]">
                        {template.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </details>

            <label className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block text-sm font-semibold text-[#1f2328]">
                  Add license
                </span>
                <span className="mt-1 block text-sm text-[#59636e]">
                  {selectedLicense?.description ??
                    "Licenses explain how others can use your code."}
                </span>
              </span>
              <select
                className="h-9 rounded-md border border-[#d0d7de] bg-[#f6f8fa] px-3 text-sm font-semibold"
                value={licenseSlug}
                onChange={(event) => setLicenseSlug(event.target.value)}
              >
                <option value="">No license</option>
                {options.licenseTemplates.map((template) => (
                  <option key={template.slug} value={template.slug}>
                    {template.displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <div className="ml-[52px] flex justify-end border-t border-[#d0d7de] pt-5">
        {formError ? (
          <p className="mr-4 self-center text-sm text-[#cf222e]" role="alert">
            {formError}
          </p>
        ) : null}
        <button
          className="h-9 rounded-md bg-[#1f883d] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={createDisabled}
          type="submit"
        >
          {submitting ? "Creating..." : "Create repository"}
        </button>
      </div>
    </form>
  );
}
