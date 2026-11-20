"use client";

import { useRef, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";
import { useHomeTab, type HomeTab } from "./home-tab-context";

const TABS: { value: HomeTab; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "igreja", label: "Minha Igreja" },
];

/**
 * Abas da home integradas ao header sticky do layout. O estado é compartilhado
 * com `HomeTabs` via `HomeTabProvider`.
 */
export function HomeHeaderTabs() {
  const homeTab = useHomeTab();
  const activeTab = homeTab?.activeTab ?? "hoje";
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const selectTab = (tab: HomeTab, index: number) => {
    homeTab?.setActiveTab(tab);
    buttonsRef.current[index]?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowLeft":
        nextIndex = (index - 1 + TABS.length) % TABS.length;
        break;
      case "ArrowRight":
        nextIndex = (index + 1) % TABS.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = TABS.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    selectTab(TABS[nextIndex].value, nextIndex);
  };

  return (
    <div
      role="tablist"
      aria-label="Visões da página inicial"
      className="flex h-14 min-h-[44px] items-stretch gap-6 sm:gap-7 ml-3 md:ml-1"
    >
      {TABS.map((tab, index) => {
        const selected = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`home-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={selected ? `home-panel-${tab.value}` : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => selectTab(tab.value, index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative flex h-14 min-h-[44px] flex-none items-center rounded-none px-0.5 text-lg font-medium tracking-tight after:absolute after:bottom-0 after:inset-x-0 after:h-[3px] after:w-full after:rounded-full after:bg-primary after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-xl",
              selected
                ? "font-semibold text-foreground after:opacity-100"
                : "text-muted-foreground hover:text-foreground after:opacity-0",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
