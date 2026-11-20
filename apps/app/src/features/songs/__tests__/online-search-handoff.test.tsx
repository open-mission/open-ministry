import { describe, expect, it } from "bun:test";

const sourceFile = new URL(
  "../components/online-search-dialog.tsx",
  import.meta.url,
);

async function source() {
  return Bun.file(sourceFile).text();
}

describe("OnlineSearchDialog -> SongFormDialog handoff", () => {
  it("fecha a busca antes de transferir o item e agenda a abertura do formulário", async () => {
    const code = await source();

    expect(code).toMatch(/setPendingItem\(/);

    const selectStart = code.indexOf("const handleSelect");
    const selectBody = code.slice(selectStart, code.indexOf("return (", selectStart));
    expect(selectBody).toContain("handleOpenChange(false)");
    expect(selectBody).not.toContain("setFormOpen(true)");

    const effectBody = code.slice(
      code.indexOf("// Só abre o formulário"),
      code.indexOf("// Só abre o formulário") + 600,
    );
    expect(effectBody).toMatch(/if\s*\(\s*open\s*\|\|\s*!pendingItem\s*\)\s*return/);
    expect(effectBody).toContain("setFormOpen(true)");
    expect(effectBody).toMatch(/setTimeout\([\s\S]{0,300}180\)/);
  });

  it("não limpa selectedItem no mesmo tick em que o formulário fecha", async () => {
    const code = await source();

    expect(code).not.toMatch(/if\s*\(\s*!isOpen\s*\)\s*setSelectedItem\(null\)/);
    expect(code).toMatch(/setTimeout\([\s\S]{0,300}200\)/);
  });

  it("memoiza o initialData enviado ao SongFormDialog", async () => {
    const code = await source();

    expect(code).toMatch(/useMemo\(/);
    expect(code).toMatch(/const\s+formInitialData\s*=\s*useMemo\(/);
    expect(code).toMatch(/initialData=\{formInitialData\}/);
  });

  it("cancela os timers ao desmontar e ao reabrir a busca", async () => {
    const code = await source();

    expect(code).toMatch(/clearTimeout\(/);
    expect(code).toMatch(/if\s*\(nextOpen\)[\s\S]{0,160}setPendingItem\(null\)/);
  });
});
