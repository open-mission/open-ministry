export type OnlineSongResult = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  lyrics?: string;
  source: "vagalume" | "lrclib";
};

type VagalumeSearchItem = {
  id: string;
  url: string;
  title: string;
  band: string;
};

type VagalumeSearchResponse = {
  response?: {
    docs?: VagalumeSearchItem[];
  };
};

type LrclibItem = {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  plainLyrics?: string;
  instrumental?: boolean;
};

/**
 * Busca músicas e letras online.
 * Tenta primeiro a API do Vagalume.
 * Em caso de instabilidade, 503 ou timeout, recorre de forma transparente ao LRCLIB.
 */
export async function searchSongsOnline(
  query: string,
): Promise<OnlineSongResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // 1. Tentar Vagalume API com timeout de 3 segundos
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const vagalumeUrl = `https://api.vagalume.com.br/search.artmus?q=${encodeURIComponent(
      cleanQuery,
    )}&limit=10`;

    const res = await fetch(vagalumeUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as VagalumeSearchResponse;
      const docs = data?.response?.docs ?? [];
      if (docs.length > 0) {
        return docs.map((doc) => ({
          id: doc.id,
          title: doc.title,
          artist: doc.band,
          source: "vagalume",
        }));
      }
    }
  } catch (err) {
    // Vagalume instável ou timeout -> segue para fallback LRCLIB
    console.warn("[searchSongsOnline] Vagalume indisponível, usando fallback:", err);
  }

  // 2. Fallback: LRCLIB (alta disponibilidade, sem rate limit e com catálogo gospel/brasileiro completo)
  try {
    const lrclibUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(
      cleanQuery,
    )}`;

    const res = await fetch(lrclibUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "OpenMinistry/1.0 (https://openministry.app)",
      },
    });

    if (res.ok) {
      const items = (await res.json()) as LrclibItem[];
      return items.slice(0, 10).map((item) => ({
        id: String(item.id),
        title: item.trackName,
        artist: item.artistName,
        album: item.albumName,
        lyrics: item.plainLyrics ?? undefined,
        source: "lrclib",
      }));
    }
  } catch (err) {
    console.error("[searchSongsOnline] Erro na busca LRCLIB:", err);
  }

  return [];
}

/**
 * Obtém a letra completa de um resultado online selecionado.
 */
export async function fetchLyricsDetails(
  item: OnlineSongResult,
): Promise<string> {
  if (item.lyrics) {
    return item.lyrics;
  }

  if (item.source === "lrclib") {
    try {
      const res = await fetch(`https://lrclib.net/api/get/${item.id}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "OpenMinistry/1.0 (https://openministry.app)",
        },
      });

      if (res.ok) {
        const data = (await res.json()) as LrclibItem;
        return data.plainLyrics ?? "";
      }
    } catch (err) {
      console.error("[fetchLyricsDetails] Erro ao buscar letra LRCLIB:", err);
    }
  }

  if (item.source === "vagalume") {
    try {
      const res = await fetch(
        `https://api.vagalume.com.br/search.php?musid=${item.id}`,
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.mus?.[0]?.text;
        if (typeof text === "string") {
          return text;
        }
      }
    } catch (err) {
      console.error("[fetchLyricsDetails] Erro ao buscar letra Vagalume:", err);
    }
  }

  return "";
}

/**
 * Gera links de busca nas plataformas de streaming caso o usuário queira encontrar rapidamente.
 */
export function generateStreamingSearchLinks(title: string, artist?: string) {
  const term = [title, artist].filter(Boolean).join(" ");
  const encoded = encodeURIComponent(term);

  return {
    youtube: `https://www.youtube.com/results?search_query=${encoded}`,
    youtubeMusic: `https://music.youtube.com/search?q=${encoded}`,
    spotify: `https://open.spotify.com/search/${encoded}`,
  };
}
