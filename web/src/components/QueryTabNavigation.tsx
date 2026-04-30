import Link from "next/link";
import type { QueryTab } from "@/lib/navigation";

type QueryTabNavigationProps = {
  activeValue: string;
  ariaLabel: string;
  hrefForTab: (value: string) => string;
  tabs: readonly QueryTab[];
};

export function QueryTabNavigation({
  activeValue,
  ariaLabel,
  hrefForTab,
  tabs,
}: QueryTabNavigationProps) {
  return (
    <nav aria-label={ariaLabel} className="tabs overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.value === activeValue;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`tab shrink-0 ${active ? "active" : ""}`}
            href={hrefForTab(tab.value)}
            key={tab.value}
            title={tab.description}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
