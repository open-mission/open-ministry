import { afterAll, describe, expect, it, mock } from "bun:test";
import {
  Fragment,
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Guarda as implementações reais antes dos mocks para restaurá-las ao final.
const actualDrawer = await import("@/components/ui/drawer");
const actualSheet = await import("@/components/ui/sheet");
const actualDialog = await import("@/components/ui/dialog");
const actualTabs = await import("@/components/ui/tabs");
const actualUseMobile = await import("@/hooks/use-mobile");
const actualRehearsalActions = await import("@/app/actions/rehearsals");
const actualNavigation = await import("next/navigation");
const actualSonner = await import("sonner");
const actualChordsViewer = await import(
  "@/features/songs/components/chords-viewer"
);

let isMobileViewport = true;
const chordsViewerProps: Record<string, unknown>[] = [];

type MockProps = {
  children?: ReactNode;
  className?: string;
  open?: boolean;
  [key: string]: unknown;
};

const passthrough = ({ children }: MockProps) =>
  createElement(Fragment, null, children);

const overlayOpenContext = createContext(true);

const OverlayMock = ({ open = true, children }: MockProps) =>
  createElement(
    overlayOpenContext.Provider,
    { value: Boolean(open) },
    children,
  );

const OverlayPanel = ({ className, children, ...props }: MockProps) => {
  const open = useContext(overlayOpenContext);
  if (!open) return null;
  return createElement(
    "div",
    { className, ...props } as never,
    children,
  );
};

const DrawerPanel = ({ className, children, ...props }: MockProps) => (
  <OverlayPanel
    data-slot="drawer-content"
    data-vaul-drawer-direction="bottom"
    className={className}
    {...props}
  >
    {children}
  </OverlayPanel>
);

const SheetPanel = ({
  className,
  children,
  side = "right",
  showCloseButton: _showCloseButton,
  ...props
}: MockProps) => (
  <OverlayPanel
    data-slot="sheet-content"
    data-side={side}
    className={className}
    {...props}
  >
    {children}
  </OverlayPanel>
);

const DialogPanel = ({ className, children, ...props }: MockProps) => (
  <OverlayPanel
    data-slot="dialog-content"
    className={className}
    {...props}
  >
    {children}
  </OverlayPanel>
);

function slotDiv(slot: string) {
  function Slot({ className, children, ...props }: MockProps) {
    return createElement(
      "div",
      { "data-slot": slot, className, ...props } as never,
      children,
    );
  }
  Slot.displayName = `MockSlot(${slot})`;
  return Slot;
}

mock.module("@/components/ui/drawer", () => ({
  Drawer: OverlayMock,
  DrawerNestedRoot: OverlayMock,
  DrawerTrigger: passthrough,
  DrawerPortal: passthrough,
  DrawerClose: passthrough,
  DrawerContent: DrawerPanel,
  DrawerHeader: slotDiv("drawer-header"),
  DrawerFooter: slotDiv("drawer-footer"),
  DrawerTitle: slotDiv("drawer-title"),
  DrawerDescription: slotDiv("drawer-description"),
}));

mock.module("@/components/ui/sheet", () => ({
  Sheet: OverlayMock,
  SheetTrigger: passthrough,
  SheetPortal: passthrough,
  SheetClose: passthrough,
  SheetContent: SheetPanel,
  SheetHeader: slotDiv("sheet-header"),
  SheetFooter: slotDiv("sheet-footer"),
  SheetTitle: slotDiv("sheet-title"),
  SheetDescription: slotDiv("sheet-description"),
}));

mock.module("@/components/ui/dialog", () => ({
  Dialog: OverlayMock,
  DialogTrigger: passthrough,
  DialogContent: DialogPanel,
  DialogHeader: slotDiv("dialog-header"),
  DialogFooter: slotDiv("dialog-footer"),
  DialogTitle: slotDiv("dialog-title"),
  DialogDescription: slotDiv("dialog-description"),
  DialogClose: passthrough,
}));

const TabsMock = ({ children }: MockProps) =>
  createElement(Fragment, null, children);

const TabsTriggerMock = ({
  className,
  children,
  value,
  ...props
}: MockProps) => (
  <button
    type="button"
    data-slot="tabs-trigger"
    data-value={value}
    className={className}
    {...props}
  >
    {children}
  </button>
);

const TabsContentMock = ({
  className,
  children,
  value,
  ...props
}: MockProps) => (
  <div
    data-slot="tabs-content"
    data-value={value}
    className={className}
    {...props}
  >
    {children}
  </div>
);

mock.module("@/components/ui/tabs", () => ({
  Tabs: TabsMock,
  TabsList: slotDiv("tabs-list"),
  TabsTrigger: TabsTriggerMock,
  TabsContent: TabsContentMock,
  tabsListVariants: () => "",
}));

mock.module("@/hooks/use-mobile", () => ({
  useIsMobile: () => isMobileViewport,
}));

mock.module("@/app/actions/rehearsals", () => ({
  createRehearsalAction: async () => ({ ok: true, data: {} }),
  updateRehearsalAction: async () => ({ ok: true, data: {} }),
  deleteRehearsalAction: async () => ({ ok: true, data: { ok: true } }),
  listRehearsalAlertRulesAction: async () => ({ ok: true, data: [] }),
  saveRehearsalAlertRulesAction: async () => ({ ok: true, data: [] }),
  resetRehearsalAlertRulesAction: async () => ({ ok: true, data: [] }),
}));

mock.module("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));

mock.module("sonner", () => ({
  toast: { success: () => {}, error: () => {} },
}));

mock.module("@/features/songs/components/chords-viewer", () => ({
  ChordsViewer: (props: Record<string, unknown>) => {
    chordsViewerProps.push(props);
    return createElement("div", { "data-slot": "chords-viewer" });
  },
}));

const { SongChordsSheet } = await import(
  "@/features/rehearsals/components/song-chords-sheet"
);
const { RehearsalPanel } = await import(
  "@/features/rehearsals/components/rehearsal-panel"
);
const { getChordsViewerControlVisibility } = await import(
  "@/features/songs/lib/chords-viewer-controls"
);

afterAll(() => {
  isMobileViewport = false;
  mock.module("@/components/ui/drawer", () => ({ ...actualDrawer }));
  mock.module("@/components/ui/sheet", () => ({ ...actualSheet }));
  mock.module("@/components/ui/dialog", () => ({ ...actualDialog }));
  mock.module("@/components/ui/tabs", () => ({ ...actualTabs }));
  mock.module("@/hooks/use-mobile", () => ({ ...actualUseMobile }));
  mock.module("@/app/actions/rehearsals", () => ({
    ...actualRehearsalActions,
  }));
  mock.module("next/navigation", () => ({ ...actualNavigation }));
  mock.module("sonner", () => ({ ...actualSonner }));
  mock.module("@/features/songs/components/chords-viewer", () => ({
    ...actualChordsViewer,
  }));
});

const song = {
  title: "Grande é o Senhor",
  artist: "Artista",
  tone: "G",
  capo: 2,
  chords: "G       D\nGrande é o Senhor",
};

function renderSheet() {
  return renderToStaticMarkup(
    createElement(SongChordsSheet, {
      song,
      open: true,
      onOpenChange: () => undefined,
    }),
  );
}

function renderPanel(canUpdate = false) {
  return renderToStaticMarkup(
    createElement(RehearsalPanel, {
      departmentId: "dept-1",
      departmentName: "Louvor",
      rehearsal: {
        id: "reh-1",
        title: "Ensaio de quinta",
        startsAt: "2026-11-19T22:00:00.000Z",
        endsAt: "2026-11-19T23:30:00.000Z",
        songs: [
          {
            songId: "song-1",
            musicalKey: "A",
            notes: "Entrar no refrão",
            song: {
              id: "song-1",
              title: song.title,
              artist: song.artist,
              tone: song.tone,
              capo: song.capo,
              chords: song.chords,
            },
          },
        ],
      },
      songs: [
        {
          id: "song-1",
          title: song.title,
          artist: song.artist,
          tone: song.tone,
        },
      ],
      alertRules: [],
      canUpdate,
      canDelete: false,
      canManageAlerts: false,
    }),
  );
}

describe("Rehearsal setlist — abrir cifra", () => {
  it("transforma cada linha do repertório em um botão acessível", () => {
    const markup = renderPanel();

    expect(markup).toContain("Abrir cifra de Grande é o Senhor");
    expect(markup).toContain("<button");
    expect(markup).toContain("Tom A");
    expect(markup).toContain("Entrar no refrão");
    expect(markup).toContain("min-h-11");
  });
});

describe("Rehearsal setlist — remover música", () => {
  it("mostra um botão de remover por música quando canUpdate é true", () => {
    const markup = renderPanel(true);

    expect(markup).toContain(
      'aria-label="Remover Grande é o Senhor do repertório"',
    );
    expect(markup).toContain(
      'aria-label="Abrir cifra de Grande é o Senhor"',
    );
    expect(markup).toContain("hover:text-destructive");
  });

  it("esconde o botão de remover quando canUpdate é false", () => {
    const markup = renderPanel(false);

    expect(markup).not.toContain("Remover Grande é o Senhor do repertório");
    expect(markup).toContain(
      'aria-label="Abrir cifra de Grande é o Senhor"',
    );
  });
});

describe("SongChordsSheet — mobile", () => {
  it("ocupa toda a tela com um Drawer 100dvh e área rolável sem arraste", () => {
    isMobileViewport = true;
    chordsViewerProps.length = 0;
    const markup = renderSheet();

    expect(markup).toContain('data-slot="drawer-content"');
    expect(markup).not.toContain('data-slot="sheet-content"');
    expect(markup).toContain("h-dvh");
    expect(markup).toContain("max-h-dvh");
    expect(markup).toContain("rounded-none");
    expect(markup).toContain("data-vaul-no-drag");
    expect(markup).toContain("overflow-y-auto");
    expect(markup).toContain("[-webkit-overflow-scrolling:touch]");
    expect(chordsViewerProps.at(-1)).toMatchObject({
      chords: song.chords,
      originalTone: song.tone,
      capo: song.capo,
      songTitle: song.title,
      hideFullscreenButton: true,
    });
  });

  it("mostra uma mensagem amigável quando cifra e letra não foram cadastradas", () => {
    isMobileViewport = true;
    chordsViewerProps.length = 0;
    const markup = renderToStaticMarkup(
      createElement(SongChordsSheet, {
        song: { ...song, chords: "", lyrics: null },
        open: true,
        onOpenChange: () => undefined,
      }),
    );

    expect(markup).toContain(
      "Cifra e letra não cadastradas para esta música",
    );
    expect(markup).not.toContain('data-slot="tabs-trigger"');
    expect(chordsViewerProps).toHaveLength(0);
  });
});

describe("SongChordsSheet — detalhes da música e abas", () => {
  it("exibe as abas Cifra e Letra com os detalhes disponíveis no cabeçalho", () => {
    isMobileViewport = true;
    chordsViewerProps.length = 0;
    const markup = renderToStaticMarkup(
      createElement(SongChordsSheet, {
        song: {
          ...song,
          collection: "Hinário",
          tags: ["adoração", "louvor"],
          bpm: 92,
          lyrics: "Santo, santo, santo\nDeus poderoso",
        },
        open: true,
        onOpenChange: () => undefined,
      }),
    );

    expect(markup).toContain('data-slot="tabs-trigger"');
    expect(markup).toContain("Cifra</button>");
    expect(markup).toContain("Letra</button>");

    expect(markup).toContain("Artista");
    expect(markup).toContain("Tom G");
    expect(markup).toContain("Capo 2");
    expect(markup).toContain("Coleção: Hinário");
    expect(markup).toContain("Tags: adoração, louvor");
    expect(markup).toContain("92 BPM");
    expect(markup).toContain("Santo, santo, santo");

    expect(chordsViewerProps.at(-1)).toMatchObject({
      chords: song.chords,
      hideFullscreenButton: true,
    });
  });

  it("mostra o estado vazio da letra quando só a cifra existe", () => {
    isMobileViewport = true;
    const markup = renderToStaticMarkup(
      createElement(SongChordsSheet, {
        song: { ...song, lyrics: null },
        open: true,
        onOpenChange: () => undefined,
      }),
    );

    expect(markup).toContain('data-slot="tabs-trigger"');
    expect(markup).toContain("Letra</button>");
    expect(markup).toContain("Letra não cadastrada para esta música");
    expect(markup).not.toContain(
      "Cifra e letra não cadastradas para esta música",
    );
  });

  it("mostra o estado vazio da cifra quando só a letra existe", () => {
    isMobileViewport = true;
    chordsViewerProps.length = 0;
    const markup = renderToStaticMarkup(
      createElement(SongChordsSheet, {
        song: { ...song, chords: "", lyrics: "Só a letra desta música" },
        open: true,
        onOpenChange: () => undefined,
      }),
    );

    expect(markup).toContain('data-slot="tabs-trigger"');
    expect(markup).toContain("Cifra</button>");
    expect(markup).toContain("Cifra não cadastrada para esta música");
    expect(markup).toContain("Só a letra desta música");
    expect(chordsViewerProps).toHaveLength(0);
  });

  it("não renderiza linha de detalhes vazia quando só há o título", () => {
    isMobileViewport = true;
    const markup = renderToStaticMarkup(
      createElement(SongChordsSheet, {
        song: {
          title: "Música sem detalhes",
          chords: "G D",
          lyrics: null,
        },
        open: true,
        onOpenChange: () => undefined,
      }),
    );

    expect(markup).toContain("Música sem detalhes");
    expect(markup).not.toContain("Artista não informado");
    expect(markup).not.toContain("mt-0.5 truncate text-xs");
  });
});

describe("SongChordsSheet — desktop", () => {
  it("usa um Sheet lateral amplo em vez do Drawer", () => {
    isMobileViewport = false;
    const markup = renderSheet();

    expect(markup).toContain('data-slot="sheet-content"');
    expect(markup).toContain('data-side="right"');
    expect(markup).toContain("sm:max-w-2xl");
    expect(markup).not.toContain('data-slot="drawer-content"');
  });
});

describe("ChordsViewer — controles do modo palco", () => {
  it("mantém copiar, atalhos e tela cheia fora do fullscreen", () => {
    expect(
      getChordsViewerControlVisibility({ isFullscreen: false }),
    ).toEqual({ copy: true, help: true, fullscreen: true });
  });

  it("esconde os controles secundários no fullscreen", () => {
    expect(
      getChordsViewerControlVisibility({ isFullscreen: true }),
    ).toEqual({ copy: false, help: false, fullscreen: false });
  });

  it("esconde só o botão de tela cheia quando dentro de um Sheet/Drawer", () => {
    expect(
      getChordsViewerControlVisibility({
        isFullscreen: false,
        hideFullscreenButton: true,
      }),
    ).toEqual({ copy: true, help: true, fullscreen: false });
  });
});
