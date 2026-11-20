import { describe, expect, it, mock } from "bun:test";
import { Fragment, createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const passthrough = ({ children }: { children?: ReactNode }) =>
  createElement(Fragment, null, children);

type TabsCapture = { value?: string; onValueChange?: unknown };

let capturedTabsProps: TabsCapture | null = null;

const tabsMock = (props: TabsCapture & { children?: ReactNode }) => {
  capturedTabsProps = props;
  return createElement("div", null, props.children);
};

mock.module("@/components/ui/tabs", () => ({
  Tabs: tabsMock,
  TabsList: passthrough,
  TabsTrigger: passthrough,
  TabsContent: passthrough,
}));

mock.module("@/components/ui/dialog", () => ({
  Dialog: passthrough,
  DialogContent: passthrough,
  DialogDescription: passthrough,
  DialogHeader: passthrough,
  DialogTitle: passthrough,
}));

mock.module("@/components/ui/sheet", () => ({
  Sheet: passthrough,
  SheetContent: passthrough,
  SheetDescription: passthrough,
  SheetHeader: passthrough,
  SheetTitle: passthrough,
}));

mock.module("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

mock.module("@/hooks/use-songs", () => ({
  useSongsQuery: () => ({ data: { songs: [], collections: [] } }),
  useCreateSongMutation: () => ({ mutateAsync: async () => ({}), isPending: false }),
  useUpdateSongMutation: () => ({ mutateAsync: async () => ({}), isPending: false }),
}));

mock.module("sonner", () => ({
  toast: { success: () => {}, error: () => {}, info: () => {} },
}));

mock.module("@/features/songs/hooks/use-song-arrangements", () => ({
  useSongArrangements: () => ({
    departments: [],
    isLoading: false,
    error: null,
    savingKey: null,
    setNotes: async () => true,
    setFormation: async () => true,
  }),
}));

const { SongFormDialog } = await import(
  "@/features/songs/components/song-form-dialog"
);

function renderWithTab(initialTab: string) {
  capturedTabsProps = null;
  renderToStaticMarkup(
    createElement(SongFormDialog, {
      open: true,
      onOpenChange: () => undefined,
      songId: "song-1",
      initialTab,
    }),
  );
  return capturedTabsProps as TabsCapture | null;
}

describe("SongFormDialog — abas controladas", () => {
  it("usa initialTab como valor controlado da aba ao abrir", () => {
    const props = renderWithTab("notas-banda");
    expect(props?.value).toBe("notas-banda");
    expect(typeof props?.onValueChange).toBe("function");
  });

  it("abre na aba padrão 'dados' quando initialTab não é informado", () => {
    const props = renderWithTab("dados");
    expect(props?.value).toBe("dados");
  });

  it("reseta a aba para initialTab quando o modal reabre", async () => {
    const source = await Bun.file(
      new URL("../components/song-form-dialog.tsx", import.meta.url),
    ).text();

    expect(source).toMatch(/const\s+\[activeTab,\s*setActiveTab\]\s*=\s*useState\(initialTab\)/);
    expect(source).toMatch(/if\s*\(open\)\s*setActiveTab\(initialTab\)/);
    expect(source).toMatch(/value=\{activeTab\}\s+onValueChange=\{setActiveTab\}/);
    expect(source).not.toMatch(/defaultValue=\{initialTab\}/);
  });

  it("padroniza o className da aba de links com as demais abas", async () => {
    const source = await Bun.file(
      new URL("../components/song-form-dialog.tsx", import.meta.url),
    ).text();

    expect(source).toMatch(
      /<TabsContent\s+value="links"\s+className="mt-0 flex-1 min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6 data-\[state=inactive\]:hidden"/,
    );
  });
});
