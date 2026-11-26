/**
 * Barrel público das ações de eventos. Sem "use server": apenas reexporta as
 * Server Actions dos módulos de domínio e os contratos de tipo.
 */
export * from "./events/crud";
export * from "./events/delete";
export * from "./events/schedules";
export * from "./events/plan-items";
export * from "./events/plan-templates";
export * from "./events/public-share";
export type {
  CopyScaleResult,
  EventFormState,
  ScheduleFormState,
  EventActionResult,
} from "@/lib/events/action-helpers";
