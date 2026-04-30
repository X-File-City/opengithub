import { CopyButton } from "@/components/CopyButton";

type DeveloperCommandBlockProps = {
  label: string;
  value: string;
  copyLabel?: string;
};

export function DeveloperCommandBlock({
  label,
  value,
  copyLabel = "Copy",
}: DeveloperCommandBlockProps) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-[#59636e]">
          {label}
        </p>
        <CopyButton label={copyLabel} value={value} />
      </div>
      <pre className="max-w-full overflow-x-auto rounded-md border border-[#d0d7de] bg-[#f6f8fa] p-3 font-mono text-xs leading-5 text-[#1f2328]">
        {value}
      </pre>
    </div>
  );
}
