import Link from "next/link";

type RepositoryPlaceholderPageProps = {
  owner: string;
  repo: string;
  title: string;
  description: string;
};

export function RepositoryPlaceholderPage({
  owner,
  repo,
  title,
  description,
}: RepositoryPlaceholderPageProps) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-8">
      <div className="rounded-md border border-[#d0d7de] bg-white p-5">
        <p className="text-sm text-[#59636e]">
          {owner} / {repo}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#1f2328]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#59636e]">
          {description}
        </p>
        <Link
          className="mt-4 inline-flex h-9 items-center rounded-md border border-[#d0d7de] bg-white px-4 text-sm font-semibold text-[#0969da] hover:bg-[#f6f8fa]"
          href={`/${owner}/${repo}`}
        >
          Back to Code
        </Link>
      </div>
    </section>
  );
}
