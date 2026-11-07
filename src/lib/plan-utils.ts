export const EVENT_TIME_ZONE = "America/Sao_Paulo";

export function formatDurationSeconds(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function parseDurationToSeconds(input: string | number): number {
  if (typeof input === "number") return Math.max(0, input);
  const str = input.trim();
  if (!str) return 0;
  if (str.includes(":")) {
    const parts = str.split(":").map(Number);
    if (parts.length === 2) {
      const [m, s] = parts;
      return (m || 0) * 60 + (s || 0);
    }
  }
  const numeric = Number(str);
  return isNaN(numeric) ? 0 : Math.round(numeric * 60);
}

export type ComputedPlanItem = {
  id: string;
  eventId: string;
  sectionId: string | null;
  type: "header" | "item";
  title: string;
  description: string | null;
  durationSeconds: number;
  order: number;
  personId: string | null;
  customResponsible: string | null;
  person?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  calculatedStartTime: Date;
  calculatedEndTime: Date;
  timeLabel: string;
  durationLabel: string;
};

export function computePlanItemTimes(
  startsAt: Date,
  items: Array<{
    id: string;
    eventId: string;
    sectionId: string | null;
    type: string;
    title: string;
    description: string | null;
    durationSeconds: number;
    order: number;
    personId: string | null;
    customResponsible: string | null;
    person?: {
      id: string;
      name: string;
      avatarUrl?: string | null;
      user?: { image?: string | null } | null;
    } | null;
  }>,
): {
  computedItems: ComputedPlanItem[];
  totalPlanSeconds: number;
} {
  let currentTime = new Date(startsAt);
  let totalPlanSeconds = 0;

  const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: EVENT_TIME_ZONE,
  });

  const computedItems: ComputedPlanItem[] = items.map((item) => {
    const itemStartsAt = new Date(currentTime);
    const duration = item.type === "header" ? 0 : item.durationSeconds || 0;
    const itemEndsAt = new Date(itemStartsAt.getTime() + duration * 1000);

    if (item.type !== "header") {
      currentTime = itemEndsAt;
      totalPlanSeconds += duration;
    }

    return {
      id: item.id,
      eventId: item.eventId,
      sectionId: item.sectionId,
      type: item.type === "header" ? "header" : "item",
      title: item.title,
      description: item.description,
      durationSeconds: item.durationSeconds,
      order: item.order,
      personId: item.personId,
      customResponsible: item.customResponsible,
      person: item.person
        ? {
            id: item.person.id,
            name: item.person.name,
            avatarUrl: item.person.avatarUrl ?? item.person.user?.image ?? null,
          }
        : null,
      calculatedStartTime: itemStartsAt,
      calculatedEndTime: itemEndsAt,
      timeLabel: timeFormatter.format(itemStartsAt),
      durationLabel: formatDurationSeconds(item.durationSeconds),
    };
  });

  return { computedItems, totalPlanSeconds };
}

export function computeDurationMinutes(
  startTime: string,
  endTime: string,
): number {
  if (!startTime || !endTime) return 90;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 90;
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff <= 0) {
    diff += 24 * 60;
  }
  return diff;
}

export function computeEndTime(
  startTime: string,
  durationMinutes: number,
): string {
  if (!startTime) return "20:30";
  const [sh, sm] = startTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm)) return "20:30";
  const total = (sh * 60 + sm + (durationMinutes || 90)) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
