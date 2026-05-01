import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { IssueCreateForm } from "@/components/IssueCreateForm";
import { RepositoryShell } from "@/components/RepositoryShell";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
import { getRepository, getSessionAndShellContext } from "@/lib/server-session";

type NewRepositoryIssuePageProps = {
  params: Promise<{ owner: string; repo: string }>;
  searchParams: Promise<{ title?: string; body?: string }>;
};

export default async function NewRepositoryIssuePage({
  params,
  searchParams,
}: NewRepositoryIssuePageProps) {
  const [{ owner, repo }, query, { session, shellContext }] = await Promise.all(
    [params, searchParams, getSessionAndShellContext()],
  );
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const base = `/${ownerLogin}/${repositoryName}`;

  if (!session.authenticated || !session.user) {
    redirect(`/login?next=${encodeURIComponent(`${base}/issues/new`)}`);
  }

  const repository = await getRepository(ownerLogin, repositoryName);

  return (
    <AppShell session={session} shellContext={shellContext}>
      {repository ? (
        <RepositoryShell
          activePath={`${base}/issues/new`}
          frameClassName="mx-auto max-w-5xl px-6 py-8"
          repository={repository}
        >
          <IssueCreateForm
            cancelHref={`${base}/issues`}
            initialBody={query.body ?? ""}
            initialTitle={query.title ?? ""}
            owner={ownerLogin}
            repo={repositoryName}
          />
        </RepositoryShell>
      ) : (
        <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
      )}
    </AppShell>
  );
}
