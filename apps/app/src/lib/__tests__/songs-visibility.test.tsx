import { describe, expect, it, mock } from "bun:test";
import { Fragment, createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { SongWithUsage } from "@/lib/songs";

const passthrough = ({ children }: { children?: ReactNode }) =>
  createElement(Fragment, null, children);

mock.module("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: async () => undefined }),
}));
mock.module("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
}));
mock.module("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: passthrough,
  DropdownMenuContent: passthrough,
  DropdownMenuItem: passthrough,
  DropdownMenuSeparator: () => null,
  DropdownMenuTrigger: passthrough,
}));

import { SongCard } from "@/features/songs/components/song-card";
import { SongDetailHeaderActions } from "@/features/songs/components/song-detail-header-actions";

const song = {
  id: "song-1",
  organizationId: "org-1",
  title: "A Casa É Sua",
  artist: "Casa Worship",
  tone: null,
  capo: 0,
  sortOrder: 0,
  bpm: null,
  timeSignature: "4/4",
  lyrics: null,
  chords: null,
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
} as SongWithUsage;

describe("song action visibility for repertoire readers", () => {
  it("shows the next-service action without exposing song-management actions on cards", () => {
    const markup = renderToStaticMarkup(
      createElement(SongCard, {
        song,
        canManage: false,
        canAddToNextService: true,
      }),
    );

    expect(markup).toContain("Adicionar ao próximo culto");
    expect(markup).not.toContain("Editar música");
    expect(markup).not.toContain("Excluir");
  });

  it("shows the next-service action when no song CRUD capability is present", () => {
    const markup = renderToStaticMarkup(
      createElement(SongDetailHeaderActions, {
        song,
        canUpdate: false,
        canDelete: false,
        canAddToNextService: true,
      }),
    );

    expect(markup).toContain("Adicionar ao próximo culto");
    expect(markup).not.toContain("Editar música");
    expect(markup).not.toContain("Excluir música");
  });
});
