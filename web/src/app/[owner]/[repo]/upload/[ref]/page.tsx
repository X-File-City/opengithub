import { AppShell } from "@/components/AppShell";
import { RepositoryPlaceholderPage } from "@/components/RepositoryPlaceholderPage";
import { getSession } from "@/lib/server-session";

type UploadFilesPageProps = {
  params: Promise<{ owner: string; repo: string; ref: string }>;
};

export default async function UploadFilesPage({
  params,
}: UploadFilesPageProps) {
  const [{ owner, repo, ref }, session] = await Promise.all([
    params,
    getSession(),
  ]);
  return (
    <AppShell session={session}>
      <RepositoryPlaceholderPage
        description={`Uploads to ${decodeURIComponent(ref)} will be implemented with the repository file editor feature. This route exists so the Code tab upload action reaches a real destination.`}
        owner={decodeURIComponent(owner)}
        repo={decodeURIComponent(repo)}
        title="Upload files"
      />
    </AppShell>
  );
}
