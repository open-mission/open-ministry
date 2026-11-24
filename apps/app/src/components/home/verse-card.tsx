import {
  VerseOfTheDayWidget,
  type VerseCardVariant,
} from "@/components/home/verse-of-the-day-widget";
import type { VerseOfTheDayData } from "@/lib/youversion";

/**
 * Compatibilidade com a API anterior: `compact` e `full` continuam aceitos e
 * agora delegam ao widget interativo que abre Drawer (< 1024px) ou Dialog
 * (desktop), com `card` e `folio` como variantes editoriais da home.
 */
export function VerseCard({
  verse,
  variant = "full",
}: {
  verse: VerseOfTheDayData;
  variant?: VerseCardVariant;
}) {
  return <VerseOfTheDayWidget verse={verse} variant={variant} />;
}
