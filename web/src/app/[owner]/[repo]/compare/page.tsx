import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RepositoryUnavailablePage } from "@/components/RepositoryUnavailablePage";
import {
  getRepository,
  getRepositoryRefs,
  getSessionAndShellContext,
} from "@/lib/server-session";

type RepositoryComparePageProps = {
  params: Promise<{ owner: string; repo: string }>;
};

export default async function RepositoryComparePage({
  params,
}: RepositoryComparePageProps) {
  const [{ owner, repo }, { session, shellContext }] = await Promise.all([
    params,
    getSessionAndShellContext(),
  ]);
  const ownerLogin = decodeURIComponent(owner);
  const repositoryName = decodeURIComponent(repo);
  const [repository, refs] = await Promise.all([
    getRepository(ownerLogin, repositoryName),
    getRepositoryRefs(ownerLogin, repositoryName),
  ]);

  if (repository) {
    const branchRefs = refs?.items.filter((ref) => ref.kind === "branch") ?? [];
    const candidate =
      branchRefs.find((ref) => ref.shortName !== repository.default_branch)
        ?.shortName ?? repository.default_branch;
    redirect(
      `/${encodeURIComponent(ownerLogin)}/${encodeURIComponent(repositoryName)}/compare/${encodeURIComponent(repository.default_branch)}...${encodeURIComponent(candidate)}`,
    );
  }

  return (
    <AppShell session={session} shellContext={shellContext}>
      <RepositoryUnavailablePage owner={ownerLogin} repo={repositoryName} />
    </AppShell>
  );
}
