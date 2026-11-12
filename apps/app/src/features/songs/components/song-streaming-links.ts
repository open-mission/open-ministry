import { isStreamingSearchUrl } from "@/lib/music/lyrics-service";

export type StreamingLink = {
  platform: "YouTube" | "YouTube Music" | "Spotify";
  url: string;
};

type SongStreamingFields = {
  youtubeUrl?: string | null;
  youtubeMusicUrl?: string | null;
  spotifyUrl?: string | null;
};

export function getStreamingLinks(song: SongStreamingFields): StreamingLink[] {
  return [
    song.youtubeUrl
      ? { platform: "YouTube" as const, url: song.youtubeUrl }
      : null,
    song.youtubeMusicUrl
      ? { platform: "YouTube Music" as const, url: song.youtubeMusicUrl }
      : null,
    song.spotifyUrl
      ? { platform: "Spotify" as const, url: song.spotifyUrl }
      : null,
  ].filter((link): link is StreamingLink => Boolean(link));
}

export function streamingLinkLabel({ platform, url }: StreamingLink) {
  return isStreamingSearchUrl(url)
    ? `Buscar no ${platform}`
    : `Abrir no ${platform}`;
}
