import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getSessionAndShellContext } from "@/lib/server-session";

export default async function CodespacesPage() {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <PlaceholderPage
      actions={[
        { href: "/new", label: "Create repository", primary: true },
        { href: "/docs/get-started", label: "Read setup guide" },
      ]}
      eyebrow="Developer environments"
      message="Codespaces is part of the global sitemap so the app shell can route here today. Cloud development environments will connect after the repository workspace and Actions foundations are complete."
      session={session}
      shellContext={shellContext}
      title="Codespaces"
    />
  );
}
