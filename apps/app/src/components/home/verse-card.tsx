import { VerseOfTheDayCard } from "@/components/dashboard/verse-of-the-day-card";
import type { VerseOfTheDayData } from "@/lib/youversion";

export function VerseCard({
  verse,
  variant = "full",
}: {
  verse: VerseOfTheDayData;
  variant?: "full" | "compact";
}) {
  return <VerseOfTheDayCard verse={verse} variant={variant} />;
}
