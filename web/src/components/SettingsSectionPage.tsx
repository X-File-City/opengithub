import {
  SettingsPlaceholderContent,
  SettingsShell,
} from "@/components/SettingsShell";
import { getSessionAndShellContext } from "@/lib/server-session";

type SettingsSectionPageProps = {
  actions?: { href: string; label: string; primary?: boolean }[];
  activeSection: string;
  children?: React.ReactNode;
  eyebrow?: string;
  message: string;
  title: string;
};

export async function SettingsSectionPage({
  actions,
  activeSection,
  children,
  eyebrow,
  message,
  title,
}: SettingsSectionPageProps) {
  const { session, shellContext } = await getSessionAndShellContext();

  return (
    <SettingsShell
      activeSection={activeSection}
      eyebrow={eyebrow}
      session={session}
      shellContext={shellContext}
      title={title}
    >
      <SettingsPlaceholderContent actions={actions} message={message}>
        {children}
      </SettingsPlaceholderContent>
    </SettingsShell>
  );
}
