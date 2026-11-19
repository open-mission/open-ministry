import { describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { SongWithDetails } from "@/lib/songs";

const song = {
  id: "song-1",
  organizationId: "org-1",
  title: "A Casa É Sua",
  artist: "Casa Worship",
  tone: "G",
  capo: 0,
  sortOrder: 0,
  bpm: null,
  timeSignature: "4/4",
  lyrics: "[Intro]\nA\n\n[Refrão]\nB",
  chords: "[Intro]A\n[Refrão]B",
  youtubeUrl: null,
  youtubeMusicUrl: null,
  spotifyUrl: null,
  collection: null,
  tags: [],
  createdById: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  usage: {
    nextEvent: null,
    lastEvent: null,
    eventCount: 0,
    planItemCount: 0,
  },
} as unknown as SongWithDetails;

mock.module("@/hooks/use-songs", () => ({
  useSongQuery: () => ({ data: { song } }),
  useSongsQuery: () => ({ data: { songs: [], collections: [] } }),
  useCreateSongMutation: () => ({
    mutateAsync: async () => ({ song: null }),
    isPending: false,
  }),
  useUpdateSongMutation: () => ({
    mutateAsync: async () => ({ song: null }),
    isPending: false,
  }),
  useDeleteSongMutation: () => ({
    mutateAsync: async () => ({ ok: true }),
    isPending: false,
  }),
  songKeys: { all: ["songs"] },
}));
mock.module("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: async () => undefined }),
}));
mock.module("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  redirect: () => undefined,
  notFound: () => undefined,
  usePathname: () => "/dashboard/songs/song-1",
  useSearchParams: () => new URLSearchParams(),
}));
mock.module("sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
}));

const arrangements = [
  {
    departmentId: "dep-1",
    departmentName: "Louvor",
    notes: { "refrao#1": "Só guitarra" },
    selectedFunctionIds: ["fn-1"],
    functions: [{ id: "fn-1", name: "Guitarra" }],
  },
];

const { SongDetailView } = await import(
  "@/features/songs/components/song-detail-view"
);

function renderDetail(canUpdate: boolean) {
  return renderToStaticMarkup(
    createElement(SongDetailView, {
      initialSong: song,
      songId: song.id,
      canUpdate,
      canDelete: false,
      canAddToNextService: false,
      initialArrangements: arrangements,
    }),
  );
}

describe("SongDetailView arrangements plumbing", () => {
  it("passa sectionNotes ao ChordsViewer e esconde edição sem canUpdate", () => {
    const html = renderDetail(false);

    expect(html).toContain("Só guitarra");
    expect(html).not.toContain("Editar nota");
  });

  it("mostra o controle de edição da nota quando canUpdate", () => {
    const html = renderDetail(true);

    expect(html).toContain("Só guitarra");
    expect(html).toContain("Editar nota");
  });
});
