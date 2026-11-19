import { describe, expect, it, mock } from "bun:test";
import { Fragment, createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const passthrough = ({ children }: { children?: ReactNode }) =>
  createElement(Fragment, null, children);

mock.module("@/components/ui/tabs", () => ({
  Tabs: passthrough,
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
  DialogFooter: passthrough,
  DialogClose: passthrough,
}));

mock.module("@/components/ui/sheet", () => ({
  Sheet: passthrough,
  SheetContent: passthrough,
  SheetDescription: passthrough,
  SheetHeader: passthrough,
  SheetTitle: passthrough,
}));

mock.module("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

mock.module("@/hooks/use-songs", () => ({
  useSongsQuery: () => ({ data: { songs: [], collections: [] } }),
  useCreateSongMutation: () => ({
    mutateAsync: async () => ({ song: null }),
    isPending: false,
  }),
  useUpdateSongMutation: () => ({
    mutateAsync: async () => ({ song: null }),
    isPending: false,
  }),
}));

mock.module("sonner", () => ({
  toast: {
    success: () => {},
    error: () => {},
    info: () => {},
  },
}));

const arrangementDepartments = [
  {
    departmentId: "dep-1",
    departmentName: "Louvor",
    notes: { "refrao#1": "Só guitarra" },
    selectedFunctionIds: ["fn-1"],
    functions: [
      { id: "fn-1", name: "Guitarra" },
      { id: "fn-2", name: "Baixo" },
    ],
  },
  {
    departmentId: "dep-2",
    departmentName: "Jovens",
    notes: { "refrao#1": "Só teclado" },
    selectedFunctionIds: ["fn-3"],
    functions: [{ id: "fn-3", name: "Teclado" }],
  },
];

mock.module("@/features/songs/hooks/use-song-arrangements", () => ({
  useSongArrangements: () => ({
    departments: arrangementDepartments,
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

const initialData = {
  title: "Teste",
  chords: "[Intro]A\n[Refrão]B",
  lyrics: "[Intro]\nA\n\n[Refrão]\nB",
};

describe("SongFormDialog — Notas & Banda", () => {
  it("renderiza aba Notas & Banda com campos por seção e funções", () => {
    const html = renderToStaticMarkup(
      createElement(SongFormDialog, {
        open: true,
        onOpenChange: () => undefined,
        songId: "song-1",
        canUpdate: true,
        initialData,
      }),
    );

    expect(html).toContain("Notas &amp; Banda");
    expect(html).toContain('data-section-key="intro#1"');
    expect(html).toContain('data-section-key="refrao#1"');
    expect(html).toContain("Só guitarra");
    expect(html).toContain("Guitarra");
    expect(html).toContain("Baixo");
    expect(html).toContain("Salvar notas");
    expect(html).toContain("Salvar formação");
  });

  it("abre no departamento informado ao editar uma nota", () => {
    const html = renderToStaticMarkup(
      createElement(SongFormDialog, {
        open: true,
        onOpenChange: () => undefined,
        songId: "song-1",
        canUpdate: true,
        initialTab: "notas-banda",
        initialDepartmentId: "dep-2",
        initialData,
      }),
    );

    expect(html).toContain("Só teclado");
    expect(html).not.toContain("Só guitarra");
  });

  it("exibe apenas leitura das notas sem canUpdate", () => {
    const html = renderToStaticMarkup(
      createElement(SongFormDialog, {
        open: true,
        onOpenChange: () => undefined,
        songId: "song-1",
        canUpdate: false,
        initialData,
      }),
    );

    expect(html).toContain("Só guitarra");
    expect(html).not.toContain('data-section-key="intro#1"');
    expect(html).not.toContain("Salvar notas");
  });
});
