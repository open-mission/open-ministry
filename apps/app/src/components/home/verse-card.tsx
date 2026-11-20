import { VerseOfTheDayCard } from "@/components/dashboard/verse-of-the-day-card";
import type { VerseOfTheDayData } from "@/lib/youversion";

export function VerseCard({ verse }: { verse: VerseOfTheDayData }) {
  return <VerseOfTheDayCard verse={verse} />;
}
