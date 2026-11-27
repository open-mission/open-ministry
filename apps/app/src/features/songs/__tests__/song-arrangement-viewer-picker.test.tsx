import { afterAll, describe, expect, it, mock } from "bun:test";
import { Fragment, createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Guarda as implementações reais antes dos mocks para restaurá-las ao final.
const actualDrawer = await import("@/components/ui/drawer");
const actualSheet = await import("@/components/ui/sheet");
const actualTabs = await import("@/components/ui/tabs");
const actualDropdownMenu = await import("@/components/ui/dropdown-menu");
const actualUseMobile = await import("@/hooks/use-mobile");
const actualNavigation = await import("next/navigation");
const actualSonner = await import("sonner");
const actualArrangementsHook = await import(
  "@/features/songs/hooks/use-song-arrangements"
);

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
  DrawerTrigger: passthrough,
}));
mock.module("@/components/ui/sheet", () => ({
  Sheet: passthrough,
  SheetContent: passthrough,
  SheetDescription: passthrough,
  SheetHeader: passthrough,
  SheetTitle: passthrough,
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
mock.module("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  redirect: () => undefined,
  notFound: () => undefined,
  usePathname: () => "/songs/song-1",
  useSearchParams: () => new URLSearchParams(),
}));
mock.module("sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
}));

const departments = [
  {
    departmentId: "dep-1",
    departmentName: "Louvor",
    notes: { "refrao#1": "Só guitarra" },
    selectedFunctionIds: [],
    functions: [],
  },
  {
    departmentId: "dep-2",
    departmentName: "Jovens",
    notes: { "refrao#1": "Só teclado" },
    selectedFunctionIds: [],
    functions: [],
  },
];

mock.module("@/features/songs/hooks/use-song-arrangements", () => ({
  useSongArrangements: () => ({
    departments,
    isLoading: false,
    error: null,
    savingKey: null,
    setNotes: async () => true,
    setFormation: async () => true,
  }),
}));

const { SongQuickDrawer } = await import(
  "@/features/songs/components/song-quick-drawer"
);
const { SongChordsSheet } = await import(
  "@/features/rehearsals/components/song-chords-sheet"
);

const song = {
  id: "song-1",
  title: "A Casa É Sua",
  artist: "Casa Worship",
  chords: "[Refrão]B",
  lyrics: "[Refrão]\nB",
};

afterAll(() => {
  mock.module("@/components/ui/drawer", () => ({ ...actualDrawer }));
  mock.module("@/components/ui/sheet", () => ({ ...actualSheet }));
  mock.module("@/components/ui/tabs", () => ({ ...actualTabs }));
  mock.module("@/components/ui/dropdown-menu", () => ({
    ...actualDropdownMenu,
  }));
  mock.module("@/hooks/use-mobile", () => ({ ...actualUseMobile }));
  mock.module("next/navigation", () => ({ ...actualNavigation }));
  mock.module("sonner", () => ({ ...actualSonner }));
  mock.module("@/features/songs/hooks/use-song-arrangements", () => ({
    ...actualArrangementsHook,
  }));
});

describe("seletor de departamento nos visualizadores", () => {
  it("o drawer rápido deixa claro de qual departamento vêm as notas", () => {
    const html = renderToStaticMarkup(
      createElement(SongQuickDrawer, {
        song,
        open: true,
        onOpenChange: () => undefined,
      }),
    );

    expect(html).toContain("Departamento");
    expect(html).toContain("Louvor");
    expect(html).toContain("Jovens");
    expect(html).toContain("Só guitarra");
    expect(html).not.toContain("Só teclado");
    expect(html).not.toContain("Editar nota");
  });

  it("o sheet do ensaio mantém o seletor e esconde a edição", () => {
    const html = renderToStaticMarkup(
      createElement(SongChordsSheet, {
        song,
        open: true,
        onOpenChange: () => undefined,
      }),
    );

    expect(html).toContain("Departamento");
    expect(html).toContain("Louvor");
    expect(html).toContain("Jovens");
    expect(html).toContain("Só guitarra");
    expect(html).not.toContain("Só teclado");
    expect(html).not.toContain("Editar nota");
    expect(html).not.toContain("Tela cheia");
  });
});
