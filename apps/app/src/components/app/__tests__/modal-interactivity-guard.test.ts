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

const ARIA_HIDDEN_SELECTOR = "[data-aria-hidden][aria-hidden]";
const INERT_SELECTOR = "[data-inert-ed][inert]";
const LOCKED_NODES_SELECTOR = `${ARIA_HIDDEN_SELECTOR}, ${INERT_SELECTOR}`;

type FakeNode = {
  inert: boolean;
  attrs: Map<string, string>;
  hasAttribute: (name: string) => boolean;
  removeAttribute: (name: string) => void;
};

function makeNode(attrs: Record<string, string>, inert = false): FakeNode {
  const map = new Map(Object.entries(attrs));
  return {
    inert,
    attrs: map,
    hasAttribute: (name: string) => map.has(name),
    removeAttribute(name: string) {
      map.delete(name);
      if (name === "inert") this.inert = false;
    },
  };
}

function nodeMatches(node: FakeNode, selector: string): boolean {
  if (selector === ARIA_HIDDEN_SELECTOR) {
    return node.hasAttribute("data-aria-hidden") && node.hasAttribute("aria-hidden");
  }
  if (selector === INERT_SELECTOR) {
    return node.hasAttribute("data-inert-ed") && node.hasAttribute("inert");
  }
  return false;
}

function makeDocument(openSelectors: string[] = [], withMarkedNodes = false) {
  const attributes = new Set<string>();
  if (openSelectors.includes("LOCK_ATTRIBUTE")) attributes.add("data-scroll-locked");

  const body = {
    style: {
      pointerEvents: "none",
      position: "",
      top: "",
      left: "",
      right: "",
      height: "",
      overflow: "",
    },
    classList: new FakeClassList(),
    hasAttribute: (name: string) => attributes.has(name),
    removeAttribute: (name: string) => attributes.delete(name),
  };
  body.classList.add("block-interactivity-dialog");
  body.classList.add("app-shell");

  const root = { style: { overflow: "" } };

  // Um ícone decorativo comum (sem marcador), um nó aria-hidden marcado e um
  // nó inert marcado — só os dois últimos devem ser limpos.
  const plainIcon = makeNode({ "aria-hidden": "true" });
  const markedAriaNode = makeNode({
    "aria-hidden": "true",
    "data-aria-hidden": "true",
  });
  const markedInertNode = makeNode(
    { inert: "", "data-inert-ed": "true" },
    true,
  );
  const nodes = withMarkedNodes
    ? [plainIcon, markedAriaNode, markedInertNode]
    : [];

  const doc = {
    body,
    documentElement: root,
    querySelector: (selector: string) => {
      if (openSelectors.includes(selector)) return { selector };
      if (selector === LOCKED_NODES_SELECTOR) {
        return (
          nodes.find(
            (node) =>
              nodeMatches(node, ARIA_HIDDEN_SELECTOR) ||
              nodeMatches(node, INERT_SELECTOR),
          ) ?? null
        );
      }
      return null;
    },
    querySelectorAll: (selector: string) =>
      nodes.filter((node) => nodeMatches(node, selector)),
  };

  return {
    doc: doc as unknown as Document,
    body,
    root,
    attributes,
    plainIcon,
    markedAriaNode,
    markedInertNode,
  };
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

  it("hasBodyLock detecta position:fixed e overflow:hidden no body e no root", () => {
    const { doc, body, root } = makeDocument();
    body.style.pointerEvents = "";
    body.classList.remove("block-interactivity-dialog");
    expect(hasBodyLock(doc)).toBe(false);

    body.style.position = "fixed";
    expect(hasBodyLock(doc)).toBe(true);
    body.style.position = "";

    body.style.overflow = "hidden";
    expect(hasBodyLock(doc)).toBe(true);
    body.style.overflow = "";

    root.style.overflow = "hidden";
    expect(hasBodyLock(doc)).toBe(true);
  });

  it("hasBodyLock detecta nós marcados por data-aria-hidden / data-inert-ed", () => {
    expect(hasBodyLock(makeDocument([], true).doc)).toBe(true);

    const { doc, body } = makeDocument();
    body.style.pointerEvents = "";
    body.classList.remove("block-interactivity-dialog");
    expect(hasBodyLock(doc)).toBe(false);
  });

  it("cleanupOrphanedBodyLock restaura position:fixed e overflow:hidden do body e do root", () => {
    const { doc, body, root, attributes } = makeDocument(["LOCK_ATTRIBUTE"]);
    body.style.position = "fixed";
    body.style.top = "12px";
    body.style.left = "0px";
    body.style.right = "0px";
    body.style.height = "100%";
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";

    expect(cleanupOrphanedBodyLock(doc)).toBe(true);
    expect(body.style.position).toBe("");
    expect(body.style.top).toBe("");
    expect(body.style.left).toBe("");
    expect(body.style.right).toBe("");
    expect(body.style.height).toBe("");
    expect(body.style.overflow).toBe("");
    expect(root.style.overflow).toBe("");
    expect(attributes.has("data-scroll-locked")).toBe(false);
  });

  it("cleanupOrphanedBodyLock remove só os nós marcados e preserva ícones aria-hidden comuns", () => {
    const { doc, plainIcon, markedAriaNode, markedInertNode } = makeDocument(
      [],
      true,
    );

    expect(cleanupOrphanedBodyLock(doc)).toBe(true);
    expect(plainIcon.hasAttribute("aria-hidden")).toBe(true);
    expect(markedAriaNode.hasAttribute("aria-hidden")).toBe(false);
    expect(markedAriaNode.hasAttribute("data-aria-hidden")).toBe(false);
    expect(markedInertNode.hasAttribute("inert")).toBe(false);
    expect(markedInertNode.hasAttribute("data-inert-ed")).toBe(false);
    expect(markedInertNode.inert).toBe(false);
  });

  it("cleanupOrphanedBodyLock não limpa nada quando um Drawer do Vaul está aberto", () => {
    const { doc, body, root, attributes, markedAriaNode } = makeDocument(
      ['[data-vaul-drawer][data-state="open"]', "LOCK_ATTRIBUTE"],
      true,
    );
    body.style.position = "fixed";
    body.style.top = "12px";
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";

    expect(MODAL_OPEN_SELECTORS).toContain(
      '[data-vaul-drawer][data-state="open"]',
    );
    expect(cleanupOrphanedBodyLock(doc)).toBe(false);
    expect(body.style.pointerEvents).toBe("none");
    expect(body.style.position).toBe("fixed");
    expect(body.style.top).toBe("12px");
    expect(body.style.overflow).toBe("hidden");
    expect(root.style.overflow).toBe("hidden");
    expect(markedAriaNode.hasAttribute("aria-hidden")).toBe(true);
    expect(attributes.has("data-scroll-locked")).toBe(true);
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

  it("usa o mesmo fallback no touchstart em capture/passive para iOS/PWA", async () => {
    const code = await source();

    expect(code).toMatch(
      /window\.addEventListener\(\s*"touchstart"[\s\S]{0,200}?passive:\s*true/,
    );
    expect(code).toMatch(
      /window\.removeEventListener\(\s*"touchstart"[\s\S]{0,120}?capture:\s*true/,
    );
    expect(code).toMatch(/capture:\s*true,\s*passive:\s*true/);
  });
});
