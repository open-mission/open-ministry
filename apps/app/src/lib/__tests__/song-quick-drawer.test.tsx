import { describe, expect, it, mock } from "bun:test";
import { Fragment, createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const passthrough = ({ children }: { children?: ReactNode }) =>
  createElement(Fragment, null, children);

mock.module("@/components/ui/drawer", () => ({
  Drawer: passthrough,
  DrawerClose: passthrough,
  DrawerContent: passthrough,
  DrawerDescription: passthrough,
  DrawerFooter: passthrough,
  DrawerHeader: passthrough,
  DrawerTitle: passthrough,
}));
mock.module("@/components/ui/tabs", () => ({
  Tabs: passthrough,
  TabsContent: passthrough,
  TabsList: passthrough,
  TabsTrigger: passthrough,
}));
mock.module("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: passthrough,
  DropdownMenuContent: passthrough,
  DropdownMenuItem: passthrough,
  DropdownMenuTrigger: passthrough,
}));

import { SongQuickDrawer } from "@/features/songs/components/song-quick-drawer";

describe("SongQuickDrawer streaming links", () => {
  it("shows stored services with shared search and direct-link labels", () => {
    const markup = renderToStaticMarkup(
      createElement(SongQuickDrawer, {
        open: true,
        onOpenChange: () => undefined,
        song: {
          id: "song-1",
          title: "A Casa É Sua",
          youtubeUrl: "https://www.youtube.com/watch?v=track-id",
          youtubeMusicUrl: "https://music.youtube.com/search?q=A%20Casa%20%C3%89%20Sua",
          spotifyUrl: "https://open.spotify.com/track/track-id",
        },
      }),
    );

    expect(markup).toContain("Abrir no YouTube");
    expect(markup).toContain("Buscar no YouTube Music");
    expect(markup).toContain("Abrir no Spotify");
  });
});
