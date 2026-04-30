"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

type NavGroup = {
  label: string;
  columns: {
    title: string;
    links: { label: string; href: string; description: string }[];
  }[];
};

const navGroups: NavGroup[] = [
  {
    label: "Product",
    columns: [
      {
        title: "Forge",
        links: [
          {
            label: "Repositories",
            href: "/explore",
            description: "Browse public code and project activity.",
          },
          {
            label: "Issues",
            href: "/issues",
            description: "Track work with labels, milestones, and search.",
          },
          {
            label: "Pull requests",
            href: "/pulls",
            description: "Review changes with context and checks.",
          },
        ],
      },
      {
        title: "Automation",
        links: [
          {
            label: "Actions",
            href: "/docs/api",
            description: "Run workflows and inspect logs from one place.",
          },
          {
            label: "Notifications",
            href: "/notifications",
            description: "A quieter inbox for mentions and reviews.",
          },
          {
            label: "Codespaces",
            href: "/codespaces",
            description: "Move from reading to editing without friction.",
          },
        ],
      },
    ],
  },
  {
    label: "Solutions",
    columns: [
      {
        title: "Teams",
        links: [
          {
            label: "Open source",
            href: "/explore",
            description: "Public projects, maintainers, releases, and stars.",
          },
          {
            label: "Organizations",
            href: "/organizations/new",
            description: "Shared ownership, teams, and repository access.",
          },
          {
            label: "Security",
            href: "/settings/security",
            description: "Sessions, keys, tokens, and audit-ready controls.",
          },
        ],
      },
      {
        title: "Operate",
        links: [
          {
            label: "API docs",
            href: "/docs/api",
            description: "REST endpoints, schemas, and examples.",
          },
          {
            label: "Git transport",
            href: "/docs/git",
            description: "Clone, fetch, push, raw files, and archives.",
          },
          {
            label: "Import",
            href: "/new/import",
            description: "Bring existing repositories into opengithub.",
          },
        ],
      },
    ],
  },
  {
    label: "Resources",
    columns: [
      {
        title: "Learn",
        links: [
          {
            label: "Get started",
            href: "/docs/get-started",
            description: "Create your first repository and push code.",
          },
          {
            label: "Markdown",
            href: "/docs/markdown",
            description: "Write issues, pull requests, and docs.",
          },
          {
            label: "Highlighting",
            href: "/docs/highlight",
            description: "Syntax rendering for readable source views.",
          },
        ],
      },
      {
        title: "Account",
        links: [
          {
            label: "Profile",
            href: "/settings/profile",
            description: "Tune your public identity and account details.",
          },
          {
            label: "Access tokens",
            href: "/settings/tokens",
            description: "Create API and Git credentials.",
          },
          {
            label: "Appearance",
            href: "/settings/appearance",
            description: "Editorial themes and display preferences.",
          },
        ],
      },
    ],
  },
];

const featureCards = [
  {
    title: "Repository workspaces",
    text: "Code, branches, commits, releases, packages, and file history stay close to the repository.",
  },
  {
    title: "Issue triage",
    text: "Saved queries, labels, milestones, assignees, and dense list rows make backlog scanning fast.",
  },
  {
    title: "Pull request review",
    text: "Conversations, checks, files changed, and metadata sit in one permission-aware workflow.",
  },
  {
    title: "Actions visibility",
    text: "Workflow runs, jobs, logs, and artifacts are readable without leaving the project.",
  },
  {
    title: "Search everywhere",
    text: "Find repositories, code, issues, pull requests, owners, and docs with URL-backed queries.",
  },
  {
    title: "Self-hostable core",
    text: "Rust API, Postgres, S3-compatible storage, and static web delivery keep operations legible.",
  },
];

const footerGroups = [
  {
    title: "Product",
    links: [
      ["Repositories", "/explore"],
      ["Issues", "/issues"],
      ["Pull requests", "/pulls"],
      ["Notifications", "/notifications"],
    ],
  },
  {
    title: "Developers",
    links: [
      ["API", "/docs/api"],
      ["Git", "/docs/git"],
      ["Markdown", "/docs/markdown"],
      ["Import", "/new/import"],
    ],
  },
  {
    title: "Company",
    links: [
      ["Security", "/settings/security"],
      ["Account", "/settings/account"],
      ["Profile", "/settings/profile"],
      ["Email", "/settings/emails"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Get started", "/docs/get-started"],
      ["Explore", "/explore"],
      ["Codespaces", "/codespaces"],
      ["Appearance", "/settings/appearance"],
    ],
  },
];

function LogoMark() {
  return (
    <span aria-hidden="true" className="marketing-logo-mark">
      o
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 16 16" width="14">
      <path
        d="M8.8 3.2 13.6 8l-4.8 4.8M13 8H2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" height="15" viewBox="0 0 16 16" width="15">
      <path
        d="m11.2 11.2 3 3M7 12.2A5.2 5.2 0 1 0 7 1.8a5.2 5.2 0 0 0 0 10.4Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function FeatureIcon({ index }: { index: number }) {
  const paths = [
    "M3 3.5h10v9H3zM5 6h6M5 8.5h4",
    "M3.5 4.5h9M3.5 8h9M3.5 11.5h5M2.5 4.5h.01M2.5 8h.01M2.5 11.5h.01",
    "M4 3.5v5a3 3 0 0 0 3 3h5M8 3.5h4v4M8 3.5l4 4",
    "M8 2.5v4l3 1.5-3 1.5v4M4 5.5h2M4 10.5h2M10 5.5h2M10 10.5h2",
    "m11.2 11.2 3 3M7 12.2A5.2 5.2 0 1 0 7 1.8a5.2 5.2 0 0 0 0 10.4Z",
    "M3 12.5V5l5-2.5 5 2.5v7l-5 2.5-5-2.5ZM3 5l5 2.5L13 5M8 7.5v7",
  ];

  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 16 16" width="18">
      <path
        d={paths[index % paths.length]}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
    </svg>
  );
}

export function MarketingHome() {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(
      trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search",
    );
  };

  return (
    <div className="marketing-page">
      <header className="marketing-header">
        <Link aria-label="opengithub home" className="marketing-brand" href="/">
          <LogoMark />
          <span>opengithub</span>
        </Link>

        <nav
          aria-label="Public navigation"
          className="marketing-nav"
          ref={navRef}
        >
          {navGroups.map((group) => (
            <div className="marketing-nav-item" key={group.label}>
              <button
                aria-expanded={openMenu === group.label}
                className="marketing-nav-button"
                onClick={() => setOpenMenu(group.label)}
                onMouseEnter={() => setOpenMenu(group.label)}
                type="button"
              >
                {group.label}
              </button>
              {openMenu === group.label ? (
                <div
                  aria-label={`${group.label} menu`}
                  className="marketing-mega-menu"
                  role="menu"
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  {group.columns.map((column) => (
                    <div key={column.title}>
                      <div className="t-label">{column.title}</div>
                      <div className="marketing-menu-links">
                        {column.links.map((link) => (
                          <Link
                            className="marketing-menu-link"
                            href={link.href}
                            key={link.label}
                            role="menuitem"
                          >
                            <span>{link.label}</span>
                            <small>{link.description}</small>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <form
          aria-label="Search opengithub"
          className="marketing-search"
          onSubmit={submitSearch}
        >
          <SearchIcon />
          <input
            aria-label="Search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search or jump to..."
            value={query}
          />
          <span className="kbd">/</span>
        </form>

        <div className="marketing-actions">
          <Link className="btn" href="/login">
            Sign in
          </Link>
          <Link className="btn primary" href="/login">
            Sign up
          </Link>
        </div>
      </header>

      <main>
        <section className="marketing-hero">
          <span className="chip soft">
            <span className="dot live" /> public preview
          </span>
          <h1
            aria-label="A calmer place for code to live."
            className="t-display"
          >
            A calmer place
            <br />
            for code to <em>live</em>.
          </h1>
          <p>
            opengithub is an open-source forge for repositories, reviews,
            issues, Actions, packages, and search, wrapped in an interface made
            for reading.
          </p>
          <form className="marketing-hero-cta" onSubmit={submitSearch}>
            <input
              aria-label="Search public projects"
              className="input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search public projects"
              value={query}
            />
            <button className="btn primary lg" type="submit">
              Search <ArrowIcon />
            </button>
            <Link className="btn lg" href="/login">
              Start with Google <ArrowIcon />
            </Link>
          </form>
          <div className="marketing-stats">
            <span>
              <strong className="t-num">4,218</strong> starred projects
            </span>
            <span>
              <strong className="t-num">142</strong> active forks
            </span>
            <span>
              <strong className="t-num">39</strong> maintainers
            </span>
            <span>MIT · hosted or self-managed</span>
          </div>
        </section>

        <section className="marketing-demo" aria-label="Repository preview">
          <div className="marketing-window">
            <div className="marketing-window-bar">
              <span />
              <span />
              <span />
              <code>opengithub.namuh.co/ashley/opengithub</code>
            </div>
            <div className="marketing-window-body">
              <aside>
                <div className="t-label">Files</div>
                {["crates/", "web/", "docs/", ".github/", "README.md"].map(
                  (file, index) => (
                    <div className="t-mono-sm" key={file}>
                      {index < 4 ? ">" : ""} {file}
                    </div>
                  ),
                )}
              </aside>
              <article>
                <div className="t-label">Repository</div>
                <h2 className="t-h1">ashley / opengithub</h2>
                <p>
                  Repository navigation, branches, pull requests, issues, and
                  Actions are first-class surfaces, not scattered side quests.
                </p>
                <div className="marketing-command t-mono">
                  $ git clone https://opengithub.namuh.co/ashley/opengithub.git
                </div>
                <div className="marketing-activity">
                  {[
                    "CI passed",
                    "3 reviews requested",
                    "12 unread mentions",
                  ].map((item) => (
                    <span className="chip soft" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="marketing-band">
          <div className="marketing-section-inner">
            <div className="t-label">Capabilities</div>
            <h2 className="t-h1">
              GitHub-shaped workflows, rendered with Editorial restraint.
            </h2>
            <div className="marketing-feature-grid">
              {featureCards.map((feature, index) => (
                <article key={feature.title}>
                  <div className="marketing-feature-icon">
                    <FeatureIcon index={index} />
                  </div>
                  <h3 className="t-h3">{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-story">
          <div>
            <div className="t-label">Story</div>
            <h2 className="t-h1">
              Built for teams that spend more time understanding code than
              announcing it.
            </h2>
          </div>
          <div className="marketing-story-cards">
            <figure className="card">
              <blockquote>
                “The repository view keeps enough context on screen that review
                feels like reading again.”
              </blockquote>
              <figcaption>Mira H. · maintainer</figcaption>
            </figure>
            <figure className="card">
              <blockquote>
                “We wanted GitHub’s working surface without inheriting its
                visual noise.”
              </blockquote>
              <figcaption>Noah K. · platform lead</figcaption>
            </figure>
          </div>
        </section>

        <section className="marketing-cta">
          <div className="card">
            <div>
              <div className="t-label">Hosted</div>
              <h2 className="t-h1">Sign in and start from a repository.</h2>
              <p>
                Google-only auth keeps the first session simple while the Rust
                API remains authoritative.
              </p>
            </div>
            <Link className="btn primary lg" href="/login">
              Sign up with Google <ArrowIcon />
            </Link>
          </div>
          <div className="card marketing-dark-card">
            <div className="t-label">Self-host</div>
            <h2 className="t-h1">
              One Rust service, one web app, one database.
            </h2>
            <p>
              Axum, Next.js, Postgres, object storage, and a deploy path that is
              explicit enough to operate.
            </p>
            <code>$ make dev</code>
          </div>
        </section>
      </main>

      <footer className="marketing-footer">
        <div className="marketing-footer-brand">
          <Link className="marketing-brand" href="/">
            <LogoMark />
            <span>opengithub</span>
          </Link>
          <p>
            Calm code hosting for repositories, reviews, issues, and Actions.
          </p>
        </div>
        <div className="marketing-footer-grid">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <div className="t-label">{group.title}</div>
              {group.links.map(([label, href]) => (
                <Link href={href} key={label}>
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
