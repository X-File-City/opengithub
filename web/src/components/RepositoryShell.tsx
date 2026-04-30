import Link from "next/link";
import type { ReactNode } from "react";
import { AppShellFrame } from "@/components/AppShellFrame";
import { RepositoryHeaderActions } from "@/components/RepositoryHeaderActions";
import type { RepositoryOverview } from "@/lib/api";
import {
  activeRepositoryTab,
  REPOSITORY_TABS,
  repositoryTabHref,
} from "@/lib/navigation";

type RepositoryShellProps = {
  repository: RepositoryOverview;
  activePath?: string;
  children: ReactNode;
  frameClassName?: string;
};

function canSeeSettings(repository: RepositoryOverview) {
  return ["owner", "admin"].includes(repository.viewerPermission ?? "");
}

export function repositoryBasePath(repository: RepositoryOverview) {
  return `/${repository.owner_login}/${repository.name}`;
}

export function RepositoryShell({
  repository,
  activePath,
  children,
  frameClassName = "grid grid-cols-[minmax(0,1fr)_296px] gap-8 max-lg:grid-cols-1",
}: RepositoryShellProps) {
  const currentTab = activeRepositoryTab(
    activePath ?? repositoryBasePath(repository),
  );

  return (
    <div>
      <header
        className="border-b px-6 pt-5"
        style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="t-sm" style={{ color: "var(--ink-3)" }}>
                <Link
                  className="hover:underline"
                  href={`/${repository.owner_login}`}
                >
                  {repository.owner_login}
                </Link>
              </p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                <h1
                  className="truncate text-xl font-semibold tracking-normal"
                  style={{ color: "var(--ink-1)" }}
                >
                  <Link
                    className="hover:underline"
                    href={repositoryBasePath(repository)}
                  >
                    {repository.name}
                  </Link>
                </h1>
                <span className="chip soft capitalize">
                  {repository.visibility}
                </span>
              </div>
            </div>
            <RepositoryHeaderActions repository={repository} />
          </div>
          <nav
            aria-label="Repository"
            className="tabs mt-5 flex gap-1 overflow-x-auto border-b text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            {REPOSITORY_TABS.filter(
              (tab) => tab.segment !== "settings" || canSeeSettings(repository),
            ).map((tab) => {
              const active = currentTab === tab.segment;
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`tab shrink-0 border-b-2 px-3 py-3 font-medium ${
                    active ? "active" : ""
                  }`}
                  href={repositoryTabHref(
                    repository.owner_login,
                    repository.name,
                    tab,
                  )}
                  key={tab.segment || "code"}
                  style={
                    active
                      ? {
                          borderColor: "var(--accent)",
                          color: "var(--ink-1)",
                        }
                      : {
                          borderColor: "transparent",
                          color: "var(--ink-3)",
                        }
                  }
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <AppShellFrame className={frameClassName} mode="repository">
        {children}
      </AppShellFrame>
    </div>
  );
}
