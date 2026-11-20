import { describe, expect, it } from "bun:test";

const choiceSource = () =>
  Bun.file(
    new URL("../components/add-song-choice-dialog.tsx", import.meta.url),
  ).text();

const importSource = () =>
  Bun.file(
    new URL("../components/import-song-dialog.tsx", import.meta.url),
  ).text();

describe("ImportSongDialog -> SongFormDialog handoff", () => {
  it("abre o formulário depois do fechamento com o timer de 220ms", async () => {
    const code = await choiceSource();

    expect(code).toMatch(/const\s+scheduleAfterClose\s*=/);
    expect(code).toMatch(/setTimeout\([\s\S]{0,220}220\)/);
    expect(code).toMatch(/openAfterSheetClose[\s\S]{0,200}scheduleAfterClose/);

    const handlerStart = code.indexOf("const handleImportReady");
    const handlerBody = code.slice(
      handlerStart,
      code.indexOf("return (", handlerStart),
    );
    expect(handlerBody).toMatch(
      /scheduleAfterClose\(\(\)\s*=>\s*setManualOpen\(true\)\)/,
    );
    expect(handlerBody).not.toMatch(/^\s*setManualOpen\(true\);/m);
  });

  it("usa Sheet do radix no mobile com modo congelado enquanto qualquer camada está aberta", async () => {
    const code = await choiceSource();

    expect(code).toContain('from "@/components/ui/sheet"');
    expect(code).not.toContain('from "@/components/ui/drawer"');
    expect(code).toMatch(/side="bottom"/);
    expect(code).toContain('from "@/hooks/use-stable-is-mobile"');
    expect(code).not.toContain('from "@/hooks/use-mobile"');
    expect(code).toMatch(
      /useStableIsMobile\(\s*mobileSheetOpen \|\| importOpen \|\| onlineOpen \|\| manualOpen\s*,?\s*\)/,
    );
  });

  it("congela o modo mobile enquanto o diálogo de importação está aberto", async () => {
    const code = await importSource();

    expect(code).toMatch(/useStableIsMobile\(open\)/);
    expect(code).not.toContain('from "@/hooks/use-mobile"');
  });
});
