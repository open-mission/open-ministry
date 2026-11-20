import { describe, expect, it } from "bun:test";

import {
  MODAL_OPEN_SELECTORS,
  cleanupOrphanedBodyLock,
  hasBodyLock,
  hasOpenModalLayers,
} from "@/components/app/modal-interactivity-guard";

class FakeClassList implements Iterable<string> {
  private classes = new Set<string>();

  contains(name: string) {
    return this.classes.has(name);
  }

  add(name: string) {
    this.classes.add(name);
  }

  remove(name: string) {
    this.classes.delete(name);
  }

  [Symbol.iterator]() {
    return this.classes.values();
  }
}

function makeDocument(openSelectors: string[] = []) {
  const attributes = new Set<string>();
  if (openSelectors.includes("LOCK_ATTRIBUTE")) attributes.add("data-scroll-locked");

  const body = {
    style: { pointerEvents: "none" },
    classList: new FakeClassList(),
    hasAttribute: (name: string) => attributes.has(name),
    removeAttribute: (name: string) => attributes.delete(name),
  };
  body.classList.add("block-interactivity-dialog");
  body.classList.add("app-shell");

  const doc = {
    body,
    querySelector: (selector: string) =>
      openSelectors.includes(selector) ? ({ selector }) : null,
  };

  return { doc: doc as unknown as Document, body, attributes };
}

describe("modal-interactivity-guard helpers", () => {
  it("hasOpenModalLayers reconhece cada seletor de camada aberta", () => {
    for (const selector of MODAL_OPEN_SELECTORS) {
      const { doc } = makeDocument([selector]);
      expect(hasOpenModalLayers(doc)).toBe(true);
    }
    expect(hasOpenModalLayers(makeDocument().doc)).toBe(false);
  });

  it("hasBodyLock detecta as três formas de lock e nada quando o body está livre", () => {
    const { doc, body, attributes } = makeDocument();

    body.style.pointerEvents = "";
    body.classList.remove("block-interactivity-dialog");
    attributes.delete("data-scroll-locked");
    expect(hasBodyLock(doc)).toBe(false);

    body.style.pointerEvents = "none";
    expect(hasBodyLock(doc)).toBe(true);
    body.style.pointerEvents = "";

    body.classList.add("block-interactivity-sheet");
    expect(hasBodyLock(doc)).toBe(true);
    body.classList.remove("block-interactivity-sheet");

    attributes.add("data-scroll-locked");
    expect(hasBodyLock(doc)).toBe(true);
  });

  it("hasBodyLock tolera um documento sem body", () => {
    expect(hasBodyLock({ body: null } as unknown as Document)).toBe(false);
  });

  it("cleanupOrphanedBodyLock limpa pointer-events, classes e atributo quando não há modal aberto", () => {
    const { doc, body, attributes } = makeDocument(["LOCK_ATTRIBUTE"]);

    expect(cleanupOrphanedBodyLock(doc)).toBe(true);
    expect(body.style.pointerEvents).toBe("");
    expect(body.classList.contains("block-interactivity-dialog")).toBe(false);
    expect(attributes.has("data-scroll-locked")).toBe(false);
    expect(body.classList.contains("app-shell")).toBe(true);
  });

  it("cleanupOrphanedBodyLock não mexe no body quando existe um diálogo aberto", () => {
    const { doc, body, attributes } = makeDocument([
      '[data-state="open"][role="dialog"]',
      "LOCK_ATTRIBUTE",
    ]);

    expect(cleanupOrphanedBodyLock(doc)).toBe(false);
    expect(body.style.pointerEvents).toBe("none");
    expect(body.classList.contains("block-interactivity-dialog")).toBe(true);
    expect(attributes.has("data-scroll-locked")).toBe(true);
  });

  it("cleanupOrphanedBodyLock preserva pointer-events que não sejam 'none'", () => {
    const { doc, body, attributes } = makeDocument(["LOCK_ATTRIBUTE"]);
    body.style.pointerEvents = "auto";

    expect(cleanupOrphanedBodyLock(doc)).toBe(true);
    expect(body.style.pointerEvents).toBe("auto");
    expect(body.classList.contains("block-interactivity-dialog")).toBe(false);
    expect(attributes.has("data-scroll-locked")).toBe(false);
  });

  it("cleanupOrphanedBodyLock é idempotente quando já não há nada para limpar", () => {
    const { doc } = makeDocument();
    expect(cleanupOrphanedBodyLock(doc)).toBe(true);
    expect(cleanupOrphanedBodyLock(doc)).toBe(false);
  });
});

describe("ModalInteractivityGuard observação e fallback", () => {
  const sourceFile = new URL(
    "../modal-interactivity-guard.tsx",
    import.meta.url,
  );
  const source = () => Bun.file(sourceFile).text();

  it("observa childList do body além dos atributos de lock", async () => {
    const code = await source();
    expect(code).toMatch(
      /observer\.observe\(body,\s*\{[\s\S]{0,400}?childList:\s*true/,
    );
    expect(code).toMatch(/attributeFilter:\s*\[[^\]]*data-scroll-locked/);
  });

  it("usa debounce de 550ms para cobrir a animação de saída do Drawer", async () => {
    const code = await source();
    expect(code).toMatch(/setTimeout\([\s\S]{0,300}?550\)/);
  });

  it("limpa locks órfãos no pointerdown em capture e remove o listener", async () => {
    const code = await source();

    expect(code).toMatch(
      /document\.addEventListener\(\s*"pointerdown"[\s\S]{0,160}?capture:\s*true/,
    );
    expect(code).toMatch(
      /document\.removeEventListener\(\s*"pointerdown"[\s\S]{0,160}?capture:\s*true/,
    );

    const handlerStart = code.indexOf("const handlePointerDown");
    const handlerBody = code.slice(handlerStart, handlerStart + 220);
    expect(handlerBody).toContain("hasBodyLock(document)");
    expect(handlerBody).toContain("cleanupOrphanedBodyLock(document)");
  });
});
