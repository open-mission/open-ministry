import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ChordsViewer } from "@/features/songs/components/chords-viewer";
import { SectionNoteStrip } from "@/features/songs/components/section-note-strip";
import { isSectionNoteEditEnabled } from "@/features/songs/lib/chords-viewer-controls";

describe("SectionNoteStrip", () => {
  it("mostra a nota da seção e nada mais sem permissão de edição", () => {
    const html = renderToStaticMarkup(
      createElement(SectionNoteStrip, {
        note: "Só guitarra e violão",
        sectionKey: "intro#1",
        canEdit: false,
      }),
    );

    expect(html).toContain("Só guitarra e violão");
    expect(html).not.toContain("Editar nota");
  });

  it("renderiza nota órfã em bucket Sem seção", () => {
    const html = renderToStaticMarkup(
      createElement(SectionNoteStrip, {
        note: "Antes era refrão",
        sectionKey: "refrao#1",
        canEdit: false,
        orphan: true,
      }),
    );

    expect(html).toContain("Sem seção");
  });

  it("esconde controle de edição sem canUpdate", () => {
    const readOnly = renderToStaticMarkup(
      createElement(SectionNoteStrip, {
        note: "Entrar em 2",
        sectionKey: "refrao#1",
        canEdit: false,
        onEdit: () => undefined,
      }),
    );
    const editable = renderToStaticMarkup(
      createElement(SectionNoteStrip, {
        note: "Entrar em 2",
        sectionKey: "refrao#1",
        canEdit: true,
        onEdit: () => undefined,
      }),
    );

    expect(readOnly).not.toContain("Editar nota");
    expect(editable).toContain("Editar nota");
  });
});

describe("ChordsViewer section notes", () => {
  it("exibe notas por seção sem controles focáveis no modo palco sem canUpdate", () => {
    const html = renderToStaticMarkup(
      createElement(ChordsViewer, {
        chords: "[Intro]A\n[Refrão]B",
        sectionNotes: {
          "intro#1": "Só guitarra e violão",
          "refrao#1": "Entrar em 2",
        },
        canEditNotes: false,
      }),
    );

    expect(html).toContain("Só guitarra e violão");
    expect(html).toContain("Entrar em 2");
    expect(html).not.toContain("Editar nota");
  });

  it("agrupa notas de seções inexistentes no card Sem seção", () => {
    const html = renderToStaticMarkup(
      createElement(ChordsViewer, {
        chords: "[Intro]A",
        sectionNotes: { "antigo#1": "Antes era refrão" },
        canEditNotes: false,
      }),
    );

    expect(html).toContain("Sem seção");
    expect(html).toContain("Antes era refrão");
  });

  it("desabilita a edição de notas durante o modo palco", () => {
    expect(isSectionNoteEditEnabled(true, false)).toBe(true);
    expect(isSectionNoteEditEnabled(true, true)).toBe(false);
    expect(isSectionNoteEditEnabled(false, false)).toBe(false);
  });
});
