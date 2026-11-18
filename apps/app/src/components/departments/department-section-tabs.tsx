import { CalendarClockIcon, Settings2Icon, UsersIcon } from "lucide-react";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";

// On mobile the bar scrolls horizontally instead of stretching three long
// labels across the viewport: flex-1 triggers cannot shrink below their
// intrinsic content width and used to push the last tab off-screen.
const tabListClassName =
  "h-auto min-h-11 w-full min-w-0 max-w-full justify-start overflow-x-auto overscroll-x-contain scrollbar-none p-1 sm:h-10 sm:w-fit";

const triggerClassName =
  "h-auto min-h-9 flex-none shrink-0 gap-1.5 px-2.5 py-1.5 text-xs leading-tight whitespace-nowrap sm:h-[calc(100%-2px)] sm:px-3 sm:text-sm";

export type DepartmentSectionTabsProps = {
  /** `false` hides the rehearsals tab when the module is unavailable. */
  showRehearsals: boolean;
};

export function DepartmentSectionTabs({
  showRehearsals,
}: DepartmentSectionTabsProps) {
  return (
    <TabsList aria-label="Seções do departamento" className={tabListClassName}>
      <TabsTrigger value="team" className={triggerClassName}>
        <UsersIcon className="size-4 shrink-0" aria-hidden />
        <span>Equipe &amp; Funções</span>
      </TabsTrigger>

      <TabsTrigger value="settings" className={triggerClassName}>
        <Settings2Icon className="size-4 shrink-0" aria-hidden />
        <span>Configurações &amp; Acesso</span>
      </TabsTrigger>

      {showRehearsals ? (
        <TabsTrigger value="rehearsals" className={triggerClassName}>
          <CalendarClockIcon className="size-4 shrink-0" aria-hidden />
          <span>Ensaios</span>
        </TabsTrigger>
      ) : null}
    </TabsList>
  );
}
