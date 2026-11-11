import "server-only";

import { ApiClient, BibleClient, ImagesClient, getVOTD } from "@youversion/platform-core";
import { remember } from "@/lib/cache";

export type VerseOfTheDayData = {
  dayOfYear: number;
  passageId: string;
  reference: string;
  content: string;
  imageUrl: string | null;
  versionName: string;
};

// Fallback gracioso para caso a API fique indisponível ou offline
const FALLBACK_VOTD: VerseOfTheDayData = {
  dayOfYear: 1,
  passageId: "PSA.119.105",
  reference: "Salmos 119:105",
  content:
    "Lâmpada para os meus pés é a tua palavra e luz, para o meu caminho.",
  imageUrl: null,
  versionName: "NVI",
};

export function getYouVersionApiKey(): string {
  return (
    process.env.YOUVERSION_API_KEY ||
    process.env.NEXT_PUBLIC_YOUVERSION_API_KEY ||
    "rWLCOWM5mOnFADQNw58VgcY4Osx8JTkVNMDe1Rk1UBwogkAh"
  );
}

export function calculateDayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff =
    date.getTime() -
    start.getTime() +
    (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function getCachedVerseOfTheDay(
  dayOfYear = calculateDayOfYear(),
): Promise<VerseOfTheDayData> {
  const apiKey = getYouVersionApiKey();
  if (!apiKey) {
    return FALLBACK_VOTD;
  }

  return remember(
    `youversion:votd:v1:${dayOfYear}`,
    43200, // 12 horas de cache
    async () => {
      try {
        // The dashboard waits for this on a cold cache. A short timeout keeps a
        // slow external API from holding the whole page render.
        const client = new ApiClient({ appKey: apiKey, timeout: 2500 });
        const bibleClient = new BibleClient(client);
        const imagesClient = new ImagesClient(client);

        // 1. Obter passage_id do dia
        const votd = await getVOTD(client, dayOfYear);
        if (!votd?.passage_id) {
          return FALLBACK_VOTD;
        }

        // 2. Obter texto da passagem em Português NVI (id: 129)
        let passage = await bibleClient
          .getPassage(129, votd.passage_id, "text")
          .catch(() => null);

        // Fallback para Bíblia Livre (id: 3254) se NVI não responder
        if (!passage?.content) {
          passage = await bibleClient
            .getPassage(3254, votd.passage_id, "text")
            .catch(() => null);
        }

        if (!passage?.content) {
          return FALLBACK_VOTD;
        }

        // 3. Buscar imagem artística do versículo se disponível
        let imageUrl: string | null = null;
        try {
          const imagesRes = await imagesClient.getImages({
            passage_id: votd.passage_id,
          });
          if (imagesRes?.data && imagesRes.data.length > 0) {
            const ptImage = imagesRes.data.find(
              (img) =>
                img.language_tag === "pt" || img.language_tag === "por",
            );
            imageUrl = ptImage?.image_url ?? imagesRes.data[0]?.image_url ?? null;
          }
        } catch {
          // Imagens são opcionais
        }

        return {
          dayOfYear,
          passageId: votd.passage_id,
          reference: passage.reference || votd.passage_id,
          content: passage.content.trim(),
          imageUrl,
          versionName: "NVI",
        };
      } catch (error) {
        console.warn("[youversion] Falha ao carregar versículo do dia:", error);
        return FALLBACK_VOTD;
      }
    },
  );
}
