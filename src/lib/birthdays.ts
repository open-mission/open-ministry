import {
  personDisplayBirthday,
  personDisplayImage,
  personDisplayName,
  type PersonLike,
} from "@/lib/person-format";

const TIME_ZONE = "America/Sao_Paulo";

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type BirthdayEntry = {
  personId: string;
  userId: string | null;
  name: string;
  image: string | null;
  month: number;
  day: number;
  dateLabel: string;
  monthLabel: string;
  daysUntil: number;
  isToday: boolean;
  isTomorrow: boolean;
  birthYear: number | null;
  turningAge: number | null;
};

type BirthdayPerson = PersonLike & { id: string };

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  timeZone: "UTC",
});

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getTodayInSaoPaulo(now: Date = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

export function monthLabel(month: number) {
  return capitalize(
    monthFormatter.format(new Date(Date.UTC(2024, month - 1, 1))),
  );
}

export function shortMonthLabel(month: number) {
  return monthFormatter
    .format(new Date(Date.UTC(2024, month - 1, 1)))
    .slice(0, 3)
    .toUpperCase();
}

function parseBirthday(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return { year, month, day };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toUtcDay(date: CalendarDate) {
  return Date.UTC(date.year, date.month - 1, date.day);
}

function daysBetween(from: CalendarDate, to: CalendarDate) {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / 86_400_000);
}

function nextOccurrence(
  birthday: { month: number; day: number },
  today: CalendarDate,
) {
  const clampedDay = Math.min(
    birthday.day,
    daysInMonth(today.year, birthday.month),
  );
  const thisYear = {
    year: today.year,
    month: birthday.month,
    day: clampedDay,
  };

  if (daysBetween(today, thisYear) >= 0) {
    return thisYear;
  }

  return {
    year: today.year + 1,
    month: birthday.month,
    day: Math.min(
      birthday.day,
      daysInMonth(today.year + 1, birthday.month),
    ),
  };
}

export function buildBirthdayEntries(
  people: BirthdayPerson[],
  options: { includeAge: boolean; today?: CalendarDate },
): BirthdayEntry[] {
  const today = options.today ?? getTodayInSaoPaulo();
  const entries: BirthdayEntry[] = [];

  for (const person of people) {
    const birthdayValue = personDisplayBirthday(person);

    if (!birthdayValue) {
      continue;
    }

    const birthday = parseBirthday(birthdayValue);

    if (!birthday) {
      continue;
    }

    const occurrence = nextOccurrence(birthday, today);
    const daysUntil = daysBetween(today, occurrence);

    entries.push({
      personId: person.id,
      userId: person.userId,
      name: personDisplayName(person),
      image: personDisplayImage(person),
      month: birthday.month,
      day: birthday.day,
      dateLabel: `${birthday.day} de ${monthLabel(birthday.month).toLowerCase()}`,
      monthLabel: monthLabel(birthday.month),
      daysUntil,
      isToday: daysUntil === 0,
      isTomorrow: daysUntil === 1,
      birthYear: options.includeAge ? birthday.year : null,
      turningAge: options.includeAge
        ? occurrence.year - birthday.year
        : null,
    });
  }

  return entries.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) {
      return a.daysUntil - b.daysUntil;
    }

    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function relativeBirthdayLabel(entry: BirthdayEntry) {
  if (entry.daysUntil === 0) {
    return "Hoje";
  }

  if (entry.daysUntil === 1) {
    return "Amanhã";
  }

  if (entry.daysUntil < 30) {
    return `Em ${entry.daysUntil} dias`;
  }

  const months = Math.round(entry.daysUntil / 30);

  if (months <= 1) {
    return "Em 1 mês";
  }

  return `Em ${months} meses`;
}

export function groupBirthdaysByMonth(
  entries: BirthdayEntry[],
  today: CalendarDate = getTodayInSaoPaulo(),
) {
  const months: { month: number; label: string; entries: BirthdayEntry[] }[] =
    [];

  for (let offset = 0; offset < 12; offset += 1) {
    const month = ((today.month - 1 + offset) % 12) + 1;
    months.push({
      month,
      label: monthLabel(month),
      entries: entries
        .filter((entry) => entry.month === month)
        .sort((a, b) => a.day - b.day),
    });
  }

  return months;
}

export function formatOwnBirthday(
  birthday: string | null,
  includeYear: boolean,
) {
  if (!birthday) {
    return null;
  }

  const parsed = parseBirthday(birthday);

  if (!parsed) {
    return null;
  }

  const base = `${parsed.day} de ${monthLabel(parsed.month).toLowerCase()}`;

  return includeYear ? `${base} de ${parsed.year}` : base;
}
