import Link from "next/link";
import { googleStartUrl, sanitizeNextPath } from "@/lib/api";

const errorMessages: Record<string, string> = {
  oauth_failed: "Google sign-in could not be completed. Try again.",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
};

function GoogleGlyph() {
  return (
    <svg aria-hidden="true" height="18" viewBox="0 0 18 18" width="18">
      <path
        d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92a8.78 8.78 0 0 0 2.68-6.61z"
        fill="#4285F4"
      />
      <path
        d="M9 18a8.59 8.59 0 0 0 5.96-2.18l-2.92-2.26a5.4 5.4 0 0 1-8.05-2.84H.96v2.33A9 9 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.99 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.03-2.33z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35l2.58-2.59A8.65 8.65 0 0 0 9 0a9 9 0 0 0-8.04 4.95l3.03 2.33A5.4 5.4 0 0 1 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);
  const errorCode = Array.isArray(params.error)
    ? params.error[0]
    : params.error;
  const errorMessage = errorCode ? errorMessages[errorCode] : null;

  return (
    <div
      className="page-enter"
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          padding: "56px 64px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Link
          className="row"
          href="/"
          style={{ gap: 10, alignSelf: "flex-start" }}
        >
          <span
            aria-hidden="true"
            className="center"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              fontFamily: "var(--display)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            o
          </span>
          <span style={{ fontFamily: "var(--display)", fontSize: 18 }}>
            opengithub
          </span>
        </Link>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 380,
          }}
        >
          <div className="t-label">Sign in</div>
          <h1 className="t-h1" style={{ fontSize: 40, marginTop: 8 }}>
            Welcome back.
          </h1>
          <p style={{ color: "var(--ink-3)", marginTop: 12 }}>
            Continue with your work account. We don&apos;t store passwords.
          </p>

          {errorMessage ? (
            <div
              className="card"
              role="alert"
              style={{
                marginTop: 24,
                padding: "12px 14px",
                fontSize: 13,
                background: "var(--err-soft)",
                borderColor: "transparent",
                color: "var(--err)",
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          <a
            className="btn lg"
            href={googleStartUrl(nextPath)}
            style={{
              marginTop: 32,
              justifyContent: "center",
              height: 46,
              fontSize: 14,
              gap: 10,
            }}
          >
            <GoogleGlyph />
            Continue with Google
          </a>

          <p style={{ color: "var(--ink-4)", fontSize: 12, marginTop: 32 }}>
            By signing in you agree to our{" "}
            <Link href="/terms" style={{ textDecoration: "underline" }}>
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ textDecoration: "underline" }}>
              privacy
            </Link>
            . We don&apos;t sell your data, ever.
          </p>
        </div>

        <footer
          className="row"
          style={{
            justifyContent: "center",
            gap: 24,
            color: "var(--ink-4)",
            fontSize: 12,
          }}
        >
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/docs/get-started">Docs</Link>
          <Link href="/support">Support</Link>
        </footer>
      </div>

      <div
        style={{
          background: "var(--ink-1)",
          color: "var(--bg)",
          padding: "56px 64px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundImage:
            "radial-gradient(circle at 30% 20%, oklch(0.30 0.10 32) 0%, transparent 50%)",
        }}
      >
        <div
          style={{
            alignSelf: "flex-end",
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--ink-5)",
          }}
        >
          v0.6 · 8a4f2c1
        </div>
        <blockquote style={{ margin: 0 }}>
          <p
            className="t-display"
            style={{
              fontSize: 32,
              lineHeight: 1.25,
              fontStyle: "italic",
              fontWeight: 400,
            }}
          >
            &ldquo;I forgot how much I&apos;d missed reviewing code that
            didn&apos;t fight back.&rdquo;
          </p>
          <footer
            style={{ marginTop: 24, color: "var(--ink-5)", fontSize: 14 }}
          >
            — Mira H., open-source maintainer
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
