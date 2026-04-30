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

function Mark() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1f2328] text-xl font-bold text-white"
    >
      o
    </div>
  );
}

function GoogleIcon() {
  return (
    <span aria-hidden="true" className="text-base font-semibold">
      G
    </span>
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
    <main className="flex min-h-screen flex-col bg-white">
      <section className="mx-auto flex w-full max-w-[352px] flex-1 flex-col items-stretch justify-center px-4 py-10">
        <Mark />
        <h1 className="mt-5 text-center text-2xl font-semibold text-[#1f2328]">
          Sign in to opengithub
        </h1>

        {errorMessage ? (
          <div
            className="mt-5 rounded-md border border-[#f1aeb5] bg-[#fff1f3] px-4 py-3 text-sm text-[#82071e]"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-4">
          <a
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#d0d7de] bg-white px-3 text-sm font-medium text-[#1f2328] shadow-sm hover:bg-[#f3f4f6]"
            href={googleStartUrl(nextPath)}
          >
            <GoogleIcon />
            Continue with Google
          </a>
        </div>

        <p className="mt-4 rounded-md border border-[#d0d7de] px-4 py-4 text-center text-sm text-[#59636e]">
          By signing in, you agree to the{" "}
          <Link className="text-[#0969da] hover:underline" href="/terms">
            Terms
          </Link>{" "}
          and{" "}
          <Link className="text-[#0969da] hover:underline" href="/privacy">
            Privacy
          </Link>
          .
        </p>
      </section>

      <footer className="border-t border-[#d0d7de] bg-[#f6f8fa] px-6 py-5">
        <nav
          aria-label="Footer"
          className="mx-auto flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-3 text-xs text-[#59636e]"
        >
          <Link className="hover:text-[#0969da] hover:underline" href="/terms">
            Terms
          </Link>
          <Link
            className="hover:text-[#0969da] hover:underline"
            href="/privacy"
          >
            Privacy
          </Link>
          <Link className="hover:text-[#0969da] hover:underline" href="/docs">
            Docs
          </Link>
          <Link
            className="hover:text-[#0969da] hover:underline"
            href="/support"
          >
            Contact opengithub Support
          </Link>
        </nav>
      </footer>
    </main>
  );
}
