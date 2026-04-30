import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-6">
      <section className="w-full max-w-[340px] text-center">
        <h1 className="text-2xl font-semibold tracking-normal text-[#1f2328]">
          opengithub
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#59636e]">
          Repository collaboration, pull requests, issues, and automation.
        </p>
        <Link
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-[#1f883d] px-4 text-sm font-medium text-white hover:bg-[#1a7f37]"
          href="/login"
        >
          Sign in
        </Link>
      </section>
    </main>
  );
}
