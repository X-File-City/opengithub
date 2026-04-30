type AppShellFrameProps = {
  children: React.ReactNode;
  className?: string;
  mode?: "centered" | "repository" | "full";
};

const MODE_CLASS_NAMES = {
  centered: "mx-auto w-full max-w-[1240px] px-6 py-8",
  repository: "w-full px-6 py-6",
  full: "w-full",
} as const;

export function AppShellFrame({
  children,
  className,
  mode = "centered",
}: AppShellFrameProps) {
  const classes = [MODE_CLASS_NAMES[mode], className].filter(Boolean).join(" ");

  return (
    <div className={classes} data-app-shell-frame={mode}>
      {children}
    </div>
  );
}
