import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

import { EVENT_TIME_ZONE } from "@/lib/plan-utils";
import { computeDurationMinutes } from "@/lib/plan-utils";
import { zonedDateTimeToUtc } from "@/lib/recurrence-utils";

export const REHEARSAL_CHANNELS = [
  "in_app",
  "push",
  "whatsapp",
  "email",
] as const;

export type RehearsalChannel = (typeof REHEARSAL_CHANNELS)[number];

export const REHEARSAL_CHANNEL_LABELS: Record<RehearsalChannel, string> = {
  in_app: "No app",
  push: "Notificação push",
  whatsapp: "WhatsApp",
  email: "E-mail",
};

export function getChannelLabel(channel: string): string {
  return (
    REHEARSAL_CHANNEL_LABELS[channel as RehearsalChannel] ?? channel
  );
}

export function getTriggerLabel(trigger: string): string {
  return trigger === "day_of_at_time"
    ? "No dia do ensaio"
    : "Antes do ensaio";
}

/**
 * Converte minutos de antecedência em texto humano curto.
 */
export function describeOffsetMinutes(offsetMinutes: number | null | undefined) {
  const minutes = Math.max(0, Math.round(offsetMinutes ?? 0));

  if (minutes === 0) return "No horário do ensaio";
  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minuto" : "minutos"} antes`;
  }

  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return `${days} ${days === 1 ? "dia" : "dias"} antes`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hora" : "horas"} antes`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${String(rest).padStart(2, "0")} antes`;
}

type AlertRuleSummaryInput = {
  triggerType: "offset_minutes" | "day_of_at_time";
  offsetMinutes?: number | null;
  timeOfDay?: string | null;
  channels: string[];
};

export function formatAlertRuleSchedule(rule: AlertRuleSummaryInput): string {
  if (rule.triggerType === "day_of_at_time") {
    return `No dia do ensaio às ${rule.timeOfDay ?? "08:00"}`;
  }

  return describeOffsetMinutes(rule.offsetMinutes);
}

export function formatAlertRuleSummary(rule: AlertRuleSummaryInput): string {
  const channels = rule.channels.map(getChannelLabel).join(", ");
  const schedule = formatAlertRuleSchedule(rule);
  return channels ? `${schedule} · ${channels}` : schedule;
}

type RehearsalTimeFields = {
  startsAt: Date | string;
  endsAt: Date | string;
};

function toTimestamp(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime();
}

/**
 * Separa os ensaios em próximos (ordem crescente) e realizados (ordem
 * decrescente), considerando o término do ensaio para decidir se já passou.
 */
export function splitRehearsals<T extends RehearsalTimeFields>(
  rehearsals: T[],
  now: Date = new Date(),
) {
  const upcoming = rehearsals
    .filter((rehearsal) => toTimestamp(rehearsal.endsAt) >= now.getTime())
    .sort((a, b) => toTimestamp(a.startsAt) - toTimestamp(b.startsAt));

  const past = rehearsals
    .filter((rehearsal) => toTimestamp(rehearsal.endsAt) < now.getTime())
    .sort((a, b) => toTimestamp(b.startsAt) - toTimestamp(a.startsAt));

  return { upcoming, past };
}

export type RehearsalSongOption = {
  id: string;
  title: string;
  artist?: string | null;
  tone?: string | null;
  collection?: string | null;
  tags?: string[] | null;
};

export type RehearsalSongDraft = {
  songId: string;
  musicalKey?: string | null;
  notes?: string | null;
};

export type RehearsalFormValues = {
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  notifyImmediately: boolean;
  songs: RehearsalSongDraft[];
};

export type RehearsalPayloadSong = {
  songId: string;
  musicalKey?: string;
  notes?: string;
};

export type RehearsalPayload = {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  songs: RehearsalPayloadSong[];
  notifyImmediately: boolean;
};

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_INPUT_PATTERN = /^\d{2}:\d{2}$/;

/**
 * Monta o payload aceito por `createRehearsalAction`/`updateRehearsalAction`.
 * A data e os horários do formulário são interpretados em America/Sao_Paulo e
 * convertidos para ISO UTC antes de sair do navegador.
 */
export function buildRehearsalPayload(
  values: RehearsalFormValues,
): RehearsalPayload {
  const title = values.title.trim();
  if (!title) {
    throw new Error("Informe o título do ensaio.");
  }

  if (!DATE_INPUT_PATTERN.test(values.date)) {
    throw new Error("Informe a data do ensaio.");
  }

  const startTime = TIME_INPUT_PATTERN.test(values.startTime)
    ? values.startTime
    : "19:00";
  const endTime = TIME_INPUT_PATTERN.test(values.endTime)
    ? values.endTime
    : "20:30";

  const startsAt = zonedDateTimeToUtc(values.date, startTime);
  const durationMinutes = computeDurationMinutes(startTime, endTime);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  const seen = new Set<string>();
  const songs: RehearsalPayloadSong[] = [];
  for (const song of values.songs) {
    const songId = song.songId?.trim();
    if (!songId || seen.has(songId)) continue;
    seen.add(songId);

    const musicalKey = song.musicalKey?.trim();
    const notes = song.notes?.trim();
    songs.push({
      songId,
      ...(musicalKey ? { musicalKey } : {}),
      ...(notes ? { notes } : {}),
    });
  }

  const description = values.description.trim();
  const location = values.location.trim();

  return {
    title,
    description: description ? description : null,
    location: location ? location : null,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    durationMinutes,
    songs,
    notifyImmediately: values.notifyImmediately,
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

type RehearsalFormSource = RehearsalTimeFields & {
  title: string;
  description?: string | null;
  location?: string | null;
  songs?: RehearsalSongDraft[];
};

/**
 * Preenche o formulário de edição com data/hora no fuso da igreja, sem
 * deslocamento de +3h causado por `toISOString()`.
 */
export function toRehearsalFormValues(
  rehearsal: RehearsalFormSource,
): RehearsalFormValues {
  const startsAt =
    rehearsal.startsAt instanceof Date
      ? rehearsal.startsAt
      : new Date(rehearsal.startsAt);
  const endsAt =
    rehearsal.endsAt instanceof Date
      ? rehearsal.endsAt
      : new Date(rehearsal.endsAt);

  const zonedStart = toZonedTime(startsAt, EVENT_TIME_ZONE);
  const zonedEnd = toZonedTime(endsAt, EVENT_TIME_ZONE);

  return {
    title: rehearsal.title,
    description: rehearsal.description ?? "",
    location: rehearsal.location ?? "",
    date: `${zonedStart.getFullYear()}-${pad2(zonedStart.getMonth() + 1)}-${pad2(
      zonedStart.getDate(),
    )}`,
    startTime: `${pad2(zonedStart.getHours())}:${pad2(zonedStart.getMinutes())}`,
    endTime: `${pad2(zonedEnd.getHours())}:${pad2(zonedEnd.getMinutes())}`,
    notifyImmediately: false,
    songs: (rehearsal.songs ?? []).map((song) => ({
      songId: song.songId,
      musicalKey: song.musicalKey ?? null,
      notes: song.notes ?? null,
    })),
  };
}

export function rehearsalSongCountLabel(count: number): string {
  if (count === 0) return "Sem músicas";
  return count === 1 ? "1 música" : `${count} músicas`;
}

export function rehearsalDateParts(
  value: Date | string,
  timeZone: string = EVENT_TIME_ZONE,
) {
  return {
    day: formatInTimeZone(value, timeZone, "dd", { locale: ptBR }),
    monthShort: formatInTimeZone(value, timeZone, "MMM", {
      locale: ptBR,
    })
      .slice(0, 3)
      .toUpperCase(),
    weekday: formatInTimeZone(value, timeZone, "EEEE", {
      locale: ptBR,
    }).replace(".", ""),
  };
}

export function formatRehearsalFullDate(
  value: Date | string,
  timeZone: string = EVENT_TIME_ZONE,
) {
  return formatInTimeZone(value, timeZone, "d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
}

export function formatRehearsalTimeRange(
  startsAt: Date | string,
  endsAt: Date | string,
  timeZone: string = EVENT_TIME_ZONE,
) {
  return `${formatInTimeZone(startsAt, timeZone, "HH:mm")} – ${formatInTimeZone(
    endsAt,
    timeZone,
    "HH:mm",
  )}`;
}


/**
 * Valores iniciais do formulário de criação, já no fuso da igreja.
 */
export function getDefaultRehearsalFormValues(
  now: Date = new Date(),
): RehearsalFormValues {
  const zoned = toZonedTime(now, EVENT_TIME_ZONE);
  return {
    title: "",
    description: "",
    location: "",
    date: `${zoned.getFullYear()}-${pad2(zoned.getMonth() + 1)}-${pad2(
      zoned.getDate(),
    )}`,
    startTime: "19:00",
    endTime: "20:30",
    notifyImmediately: false,
    songs: [],
  };
}

