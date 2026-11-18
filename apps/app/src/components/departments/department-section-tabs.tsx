import {
  CalendarClockIcon,
  LayersIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";

// On mobile the bar scrolls horizontally instead of stretching three long
// labels across the viewport: flex-1 triggers cannot shrink below their
// intrinsic content width and used to push the last tab off-screen.
const tabListClassName =
  "h-auto min-h-11 w-full min-w-0 max-w-full justify-start overflow-x-auto overscroll-x-contain scrollbar-none p-1 sm:h-10 sm:w-fit";

const triggerClassName =
  "h-auto min-h-9 flex-none shrink-0 gap-1.5 px-2.5 py-1.5 text-xs leading-tight whitespace-nowrap sm:h-[calc(100%-2px)] sm:px-3 sm:text-sm";

const badgeClassName =
  "inline-flex shrink-0 items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground";

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export type DepartmentSectionTabsProps = {
  membersCount: number;
  functionsCount: number;
  activeModuleCount: number;
  /** `null` hides the rehearsals tab when the module is unavailable. */
  rehearsalsCount: number | null;
};

export function DepartmentSectionTabs({
  membersCount,
  functionsCount,
  activeModuleCount,
  rehearsalsCount,
}: DepartmentSectionTabsProps) {
  return (
    <TabsList aria-label="Seções do departamento" className={tabListClassName}>
      <TabsTrigger value="team" className={triggerClassName}>
        <UsersIcon className="size-4 shrink-0" aria-hidden />
        <span>Equipe &amp; Funções</span>
        <span
          aria-label={`${membersCount} pessoas e ${functionsCount} funções`}
          title={`${membersCount} pessoas e ${functionsCount} funções`}
          className={badgeClassName}
        >
          <span aria-hidden className="inline-flex items-center gap-0.5">
            <span>{countLabel(membersCount, "pessoa", "pessoas")}</span>
            <span className="text-border">·</span>
            <span>{countLabel(functionsCount, "função", "funções")}</span>
          </span>
        </span>
      </TabsTrigger>

      <TabsTrigger value="settings" className={triggerClassName}>
        <Settings2Icon className="size-4 shrink-0" aria-hidden />
        <span>Configurações &amp; Acesso</span>
        <span
          aria-label={`${activeModuleCount} recursos ativos no departamento`}
          title={`${activeModuleCount} recursos ativos no departamento`}
          className={badgeClassName}
        >
          <LayersIcon className="size-3" aria-hidden />
          <span aria-hidden>
            {countLabel(activeModuleCount, "recurso", "recursos")}
          </span>
        </span>
      </TabsTrigger>

      {rehearsalsCount !== null ? (
        <TabsTrigger value="rehearsals" className={triggerClassName}>
          <CalendarClockIcon className="size-4 shrink-0" aria-hidden />
          <span>Ensaios</span>
          <span
            aria-label={`${rehearsalsCount} ensaios`}
            title={`${rehearsalsCount} ensaios`}
            className={badgeClassName}
          >
            <span aria-hidden>
              {countLabel(rehearsalsCount, "ensaio", "ensaios")}
            </span>
          </span>
        </TabsTrigger>
      ) : null}
    </TabsList>
  );
}
