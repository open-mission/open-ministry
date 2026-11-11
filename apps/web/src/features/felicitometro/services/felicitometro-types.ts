import { format } from "date-fns";

export type MoodDefinition = {
  score: number;
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
};

export const MOOD_LEVELS: Record<number, MoodDefinition> = {
  1: {
    score: 1,
    label: "Muito difícil",
    shortLabel: "Difícil",
    emoji: "😢",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800/60",
  },
  2: {
    score: 2,
    label: "Pesado ou cansado",
    shortLabel: "Pesado",
    emoji: "😟",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800/60",
  },
  3: {
    score: 3,
    label: "Normal / Indo",
    shortLabel: "Normal",
    emoji: "😐",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-800/60",
  },
  4: {
    score: 4,
    label: "Bem e em paz",
    shortLabel: "Bem",
    emoji: "😊",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800/60",
  },
  5: {
    score: 5,
    label: "Abençoado e radiante",
    shortLabel: "Abençoado",
    emoji: "🌟",
    color: "text-amber-500 dark:text-amber-300",
    bg: "bg-amber-50/80 dark:bg-amber-950/30",
    border: "border-amber-300 dark:border-amber-700/60",
  },
};

export function getTodayDateString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export type MoodOverview = {
  averageScore: number;
  totalCheckIns: number;
  prayerRequestsCount: number;
  talkRequestsCount: number;
  dailyTimeline: {
    date: string;
    displayDate: string;
    averageScore: number;
    count: number;
    prayerCount: number;
    talkCount: number;
  }[];
  scoreDistribution: {
    score: number;
    label: string;
    emoji: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  recentCareRequests: {
    id: string;
    personId: string;
    personName: string;
    personImage: string | null;
    personPhone: string | null;
    departmentNames: string[];
    date: string;
    score: number;
    needsPrayer: boolean;
    needsTalk: boolean;
    notes: string | null;
  }[];
};
