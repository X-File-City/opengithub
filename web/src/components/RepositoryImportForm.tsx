"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  RepositoryCreationOptions,
  RepositoryOwnerType,
  RepositoryVisibility,
} from "@/lib/api";

type RepositoryImportFormProps = {
  options: RepositoryCreationOptions;
};

const VISIBILITY_COPY: Record<
  Exclude<RepositoryVisibility, "internal">,
  string
> = {
  public: "Anyone on the internet can see this repository.",
  private: "You choose who can see and commit to this repository.",
};

function ownerKey(ownerType: RepositoryOwnerType, ownerId: string) {
  return `${ownerType}:${ownerId}`;
}

export function importNameFromUrl(sourceUrl: string): string {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    const lastSegment = url.pathname.split("/").filter(Boolean).pop() ?? "";
    return lastSegment.replace(/\.git$/i, "");
  } catch {
    return (
      trimmed
        .split("/")
        .filter(Boolean)
        .pop()
        ?.replace(/\.git$/i, "") ?? ""
    );
  }
}

function normalizeRepositoryName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function RepositoryImportForm({ options }: RepositoryImportFormProps) {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceUsername, setSourceUsername] = useState("");
  const [sourceToken, setSourceToken] = useState("");
  const [sourcePassword, setSourcePassword] = useState("");
  const [selectedOwnerKey, setSelectedOwnerKey] = useState(() => {
    const firstOwner = options.owners[0];
    return firstOwner
      ? ownerKey(firstOwner.ownerType, firstOwner.id)
      : "user:missing";
  });
  const [name, setName] = useState("");
  const [visibility, setVisibility] =
    useState<Exclude<RepositoryVisibility, "internal">>("public");
  const [submitting, setSubmitting] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  const selectedOwner = useMemo(
    () =>
      options.owners.find(
        (owner) => ownerKey(owner.ownerType, owner.id) === selectedOwnerKey,
      ) ?? options.owners[0],
    [options.owners, selectedOwnerKey],
  );
  const normalizedName = normalizeRepositoryName(name);
  const suggestedName = importNameFromUrl(sourceUrl);

  useEffect(() => {
    if (sourceError) {
      sourceInputRef.current?.focus();
      return;
    }
    if (nameError) {
      nameInputRef.current?.focus();
      return;
    }
    if (formError) {
      formErrorRef.current?.focus();
    }
  }, [formError, nameError, sourceError]);

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSourceError(null);
    setNameError(null);
    setFormError(null);

    if (!sourceUrl.trim()) {
      setSourceError("Source repository URL is required.");
      return;
    }
    if (!selectedOwner) {
      setFormError("Choose an owner before starting the import.");
      return;
    }
    if (!normalizedName) {
      setNameError("Destination repository name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/new/imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceUrl,
          sourceUsername: sourceUsername || null,
          sourceToken: sourceToken || null,
          sourcePassword: sourcePassword || null,
          ownerType: selectedOwner.ownerType,
          ownerId: selectedOwner.id,
          name: normalizedName,
          description: `Imported from ${sourceUrl.trim()}`,
          visibility,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        const message =
          body?.error?.message ?? "Repository import could not start.";
        if (body?.error?.code === "validation_failed") {
          setSourceError(message);
        } else if (body?.error?.code === "conflict") {
          setNameError(message);
        } else {
          setFormError(message);
        }
        setSubmitting(false);
        return;
      }

      router.push(body.statusHref ?? `/new/import/${body.id}`);
    } catch {
      setFormError("Repository import could not start. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      aria-busy={submitting}
      className="mx-auto max-w-[820px] px-4 py-7 sm:px-6"
      onSubmit={(event) => void submitImport(event)}
    >
      <header className="border-b pb-5" style={{ borderColor: "var(--line)" }}>
        <h1 className="t-h2" style={{ color: "var(--ink-1)" }}>
          Import your project to opengithub
        </h1>
        <p
          className="mt-2 max-w-2xl t-sm leading-5"
          style={{ color: "var(--ink-3)" }}
        >
          Bring source history from an existing Git remote into a new opengithub
          repository.
        </p>
      </header>

      <section className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 pt-6 sm:grid-cols-[36px_minmax(0,1fr)] sm:gap-x-4">
        <div className="flex flex-col items-center">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full t-sm font-semibold"
            style={{ background: "var(--ink-4)", color: "var(--bg)" }}
          >
            1
          </span>
          <span
            className="mt-2 flex-1 border-l"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <div className="pb-7">
          <h2 className="t-h3" style={{ color: "var(--ink-1)" }}>
            Source repository
          </h2>
          <label className="mt-4 block">
            <span
              className="t-sm font-semibold"
              style={{ color: "var(--ink-1)" }}
            >
              Source repository URL *
            </span>
            <input
              aria-describedby="source-url-help source-url-error"
              aria-invalid={sourceError ? "true" : "false"}
              className="input mt-2 h-9 w-full px-3 t-sm"
              placeholder="https://github.com/octocat/Hello-World.git"
              ref={sourceInputRef}
              value={sourceUrl}
              onBlur={() => {
                if (!name.trim() && suggestedName) {
                  setName(suggestedName);
                }
              }}
              onChange={(event) => {
                setSourceUrl(event.target.value);
                setSourceError(null);
              }}
              required
              type="url"
            />
          </label>
          <p
            className="mt-2 t-sm"
            id="source-url-help"
            style={{ color: "var(--ink-3)" }}
          >
            Public HTTPS Git remotes are supported in this build slice.
          </p>
          {sourceError ? (
            <p
              className="mt-2 t-sm"
              id="source-url-error"
              style={{ color: "var(--err)" }}
            >
              {sourceError}
            </p>
          ) : null}

          <details
            className="mt-4 rounded-md p-4"
            style={{
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
            }}
          >
            <summary
              className="cursor-pointer t-sm font-semibold"
              style={{ color: "var(--ink-1)" }}
            >
              Optional credentials for private sources
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span
                  className="t-sm font-semibold"
                  style={{ color: "var(--ink-1)" }}
                >
                  Username
                </span>
                <input
                  className="input mt-2 h-9 w-full px-3 t-sm"
                  value={sourceUsername}
                  onChange={(event) => setSourceUsername(event.target.value)}
                />
              </label>
              <label className="block">
                <span
                  className="t-sm font-semibold"
                  style={{ color: "var(--ink-1)" }}
                >
                  Access token
                </span>
                <input
                  autoComplete="off"
                  className="input mt-2 h-9 w-full px-3 t-sm"
                  value={sourceToken}
                  onChange={(event) => setSourceToken(event.target.value)}
                  type="password"
                />
              </label>
              <label className="block sm:col-span-2">
                <span
                  className="t-sm font-semibold"
                  style={{ color: "var(--ink-1)" }}
                >
                  Password
                </span>
                <input
                  autoComplete="off"
                  className="input mt-2 h-9 w-full px-3 t-sm"
                  value={sourcePassword}
                  onChange={(event) => setSourcePassword(event.target.value)}
                  type="password"
                />
              </label>
            </div>
          </details>
        </div>
      </section>

      <section className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[36px_minmax(0,1fr)] sm:gap-x-4">
        <div className="flex flex-col items-center">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full t-sm font-semibold"
            style={{ background: "var(--ink-4)", color: "var(--bg)" }}
          >
            2
          </span>
        </div>
        <div>
          <h2 className="t-h3" style={{ color: "var(--ink-1)" }}>
            Destination
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
            <label className="block">
              <span
                className="t-sm font-semibold"
                style={{ color: "var(--ink-1)" }}
              >
                Owner *
              </span>
              <select
                className="input mt-2 h-9 w-full px-3 t-sm"
                value={selectedOwnerKey}
                onChange={(event) => setSelectedOwnerKey(event.target.value)}
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
              <span
                className="t-sm font-semibold"
                style={{ color: "var(--ink-1)" }}
              >
                Repository name *
              </span>
              <input
                aria-describedby="destination-name-help destination-name-error"
                aria-invalid={nameError ? "true" : "false"}
                className="input mt-2 h-9 w-full px-3 t-sm"
                ref={nameInputRef}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(null);
                }}
                required
              />
            </label>
          </div>
          <p
            className="mt-2 t-sm"
            id="destination-name-help"
            style={{ color: "var(--ink-3)" }}
          >
            {normalizedName
              ? `This will create ${selectedOwner?.login ?? "owner"}/${normalizedName}.`
              : "Choose where opengithub should create the imported repository."}
          </p>
          {nameError ? (
            <p
              className="mt-2 t-sm"
              id="destination-name-error"
              style={{ color: "var(--err)" }}
            >
              {nameError}
            </p>
          ) : null}

          <fieldset className="mt-5">
            <legend
              className="t-sm font-semibold"
              style={{ color: "var(--ink-1)" }}
            >
              Visibility
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(["public", "private"] as const).map((option) => (
                <label
                  className="flex cursor-pointer gap-3 rounded-md p-3 t-sm"
                  key={option}
                  style={{
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                  }}
                >
                  <input
                    aria-label={option === "public" ? "Public" : "Private"}
                    checked={visibility === option}
                    className="mt-1"
                    name="visibility"
                    onChange={() => setVisibility(option)}
                    type="radio"
                    value={option}
                  />
                  <span>
                    <span
                      className="block font-semibold capitalize"
                      style={{ color: "var(--ink-1)" }}
                    >
                      {option}
                    </span>
                    <span className="block" style={{ color: "var(--ink-3)" }}>
                      {VISIBILITY_COPY[option]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {formError ? (
            <p
              className="mt-4 t-sm"
              ref={formErrorRef}
              role="alert"
              tabIndex={-1}
              style={{ color: "var(--err)" }}
            >
              {formError}
            </p>
          ) : null}

          <div
            className="mt-6 flex flex-wrap items-center gap-3 border-t pt-5"
            style={{ borderColor: "var(--line)" }}
          >
            <button
              className="btn primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                submitting || !selectedOwner || !sourceUrl || !normalizedName
              }
              type="submit"
            >
              {submitting ? "Starting import..." : "Begin import"}
            </button>
            <p className="t-sm" role="status" style={{ color: "var(--ink-3)" }}>
              Credentials are stored as redacted secret references by the Rust
              API.
            </p>
          </div>
        </div>
      </section>
    </form>
  );
}
