import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SONGS_DIR = join(
  import.meta.dir,
  "..",
  "components",
);

function readSongFile(relativePath: string) {
  return readFileSync(join(SONGS_DIR, relativePath), "utf8");
}

describe("Repertório & Músicas — Opção A (Foco no Palco & Leitura Limpa)", () => {
  it("mantém SongQuickDrawer no padrão @openministry/ui sem text-[10px]", () => {
    const source = readSongFile("song-quick-drawer.tsx");
    expect(source).toContain("max-h-[85dvh]");
    expect(source).toContain("rounded-t-xl");
    expect(source).toContain("bg-popover");
    expect(source).toContain("[-webkit-overflow-scrolling:touch]");
    expect(source).toContain("min-h-11");
    expect(source).not.toContain("h-[92dvh]");
    expect(source).not.toContain("rounded-t-[28px]");
    expect(source).not.toContain("text-[10px]");
  });

  it("remove o botão X colidente no Modo Palco e usa StageShell + SectionJumpPills em ChordsViewer", () => {
    const chordsSource = readSongFile("chords-viewer.tsx");
    const stageShellSource = readSongFile("viewer/stage-shell.tsx");

    expect(chordsSource).toContain("StageShell");
    expect(chordsSource).toContain("SectionJumpPills");
    expect(chordsSource).not.toContain("Fechar modo palco");
    expect(stageShellSource).toContain("useStageWakeLock");
    expect(stageShellSource).toContain('aria-label="Sair do modo palco (Esc)"');
    expect(stageShellSource).not.toContain("Fechar modo palco");
  });

  it("habilita Modo Palco unificado (StageShell + WakeLock) e salto por seções em SongLyricsViewer", () => {
    const lyricsSource = readSongFile("song-lyrics-viewer.tsx");
    expect(lyricsSource).toContain("StageShell");
    expect(lyricsSource).toContain("SectionJumpPills");
    expect(lyricsSource).toContain("Modo Palco");
    expect(lyricsSource).toContain("useAutoScroll");
  });

  it("estrutura SongDetailView em 2 colunas no desktop, Drawer Info no mobile e estado sem cifra", () => {
    const detailSource = readSongFile("song-detail-view.tsx");
    expect(detailSource).toContain("lg:grid-cols-[minmax(0,1fr)_300px]");
    expect(detailSource).toContain("Info");
    expect(detailSource).toContain("Cifra ainda não adicionada");
    expect(detailSource).toContain("Ver Letra");
    expect(detailSource).toContain("max-h-[85dvh] rounded-t-xl bg-popover");
  });

  it("elimina text-[10px] nos componentes principais de Repertório", () => {
    for (const file of [
      "songs-list-view.tsx",
      "song-card.tsx",
      "song-quick-drawer.tsx",
      "song-tags-list.tsx",
      "song-detail-view.tsx",
      "song-detail/song-detail-context-panel.tsx",
      "chords-viewer.tsx",
      "chords-viewer/chords-toolbar.tsx",
      "song-lyrics-viewer.tsx",
    ]) {
      expect(readSongFile(file)).not.toContain("text-[10px]");
    }
  });
});
