import { describe, expect, it } from "bun:test";
import {
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import { DepartmentSectionTabs } from "@/components/departments/department-section-tabs";

type TabsProps = {
  membersCount?: number;
  functionsCount?: number;
  activeModuleCount?: number;
  rehearsalsCount?: number | null;
};

function renderTabs(props: TabsProps = {}) {
  return DepartmentSectionTabs({
    membersCount: 7,
    functionsCount: 5,
    activeModuleCount: 6,
    rehearsalsCount: 0,
    ...props,
  });
}

function collectElements(
  node: ReactNode,
  acc: ReactElement[] = [],
): ReactElement[] {
  if (Array.isArray(node)) {
    for (const child of node) collectElements(child, acc);
    return acc;
  }

  if (isValidElement(node)) {
    acc.push(node as ReactElement);
    const { children } = (node as ReactElement).props as {
      children?: ReactNode;
    };
    collectElements(children, acc);
  }

  return acc;
}

function elementProps(element: ReactElement) {
  return element.props as Record<string, unknown>;
}

function classNameOf(element: ReactElement) {
  return String(elementProps(element).className ?? "");
}

function findList(tree: ReactNode) {
  return collectElements(tree).find(
    (element) =>
      elementProps(element)["aria-label"] === "Seções do departamento",
  );
}

function findTriggers(tree: ReactNode) {
  return collectElements(tree).filter(
    (element) => typeof elementProps(element).value === "string",
  );
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textOf).join("");
  }

  if (isValidElement(node)) {
    const { children } = (node as ReactElement).props as {
      children?: ReactNode;
    };
    return textOf(children);
  }

  return "";
}

function findBadge(tree: ReactNode, labelPattern: RegExp) {
  return collectElements(tree).find((element) =>
    labelPattern.test(String(elementProps(element)["aria-label"] ?? "")),
  );
}

function expectClasses(className: string, classes: string[]) {
  for (const expected of classes) {
    expect(className).toContain(expected);
  }
}

// Classes são verificadas na árvore de elementos do componente (sem render),
// porque vários testes deste pacote registram mocks globais de
// `@/components/ui/tabs` que vazam para os demais arquivos.
describe("Department section tabs — mobile layout", () => {
  it("contains overflow inside the tab list instead of pushing tabs off-screen", () => {
    const list = findList(renderTabs());

    expect(list).toBeDefined();
    const className = classNameOf(list!);

    expectClasses(className, [
      "w-full",
      "max-w-full",
      "min-w-0",
      "overflow-x-auto",
      "overscroll-x-contain",
      "scrollbar-none",
      "justify-start",
      "min-h-11",
    ]);
    // A barra não estica mais os triggers; é isso que empurrava a 3ª aba
    // para fora da viewport no mobile.
    expect(className).not.toContain("justify-stretch");
  });

  it("keeps desktop behaviour (natural width, single line) from sm upwards", () => {
    const list = findList(renderTabs());
    const triggers = findTriggers(renderTabs());

    expectClasses(classNameOf(list!), ["sm:h-10", "sm:w-fit"]);
    for (const trigger of triggers) {
      expectClasses(classNameOf(trigger), [
        "sm:text-sm",
        "sm:px-3",
        "whitespace-nowrap",
      ]);
    }
  });

  it("gives every trigger a non-shrinking target with readable typography", () => {
    const triggers = findTriggers(renderTabs());

    expect(triggers).toHaveLength(3);
    for (const trigger of triggers) {
      const className = classNameOf(trigger);

      expectClasses(className, [
        "flex-none",
        "shrink-0",
        "whitespace-nowrap",
        // min-h-9 = 36px e text-xs = 12px: acima dos pisos de 24px e 11px.
        "min-h-9",
        "text-xs",
        "px-2.5",
      ]);
      // Regressão: trigger flex-1 com quebra de linha estourava o w-full.
      expect(className).not.toContain("whitespace-normal");
      expect(className).not.toContain("flex-1");
    }
  });

  it("keeps the counters as small, non-shrinking 11px pills", () => {
    const tree = renderTabs();
    const badges = collectElements(tree).filter((element) =>
      /pessoas|recursos ativos|ensaios/.test(
        String(elementProps(element)["aria-label"] ?? ""),
      ),
    );

    expect(badges).toHaveLength(3);
    for (const badge of badges) {
      const className = classNameOf(badge);
      expectClasses(className, ["shrink-0", "text-[11px]", "tabular-nums"]);
    }
  });

  it("hides the rehearsals tab when the department has no rehearsals module", () => {
    const triggers = findTriggers(renderTabs({ rehearsalsCount: null }));

    expect(triggers).toHaveLength(2);
    expect(
      triggers.some((trigger) => elementProps(trigger).value === "rehearsals"),
    ).toBe(false);
  });
});

describe("Department section tabs — badge labels", () => {
  it("spells out members and functions instead of a bare pair of numbers", () => {
    const tree = renderTabs();
    const badge = findBadge(tree, /pessoas/);

    expect(badge).toBeDefined();
    const text = textOf(badge!);

    expect(text).toContain("7 pessoas");
    expect(text).toContain("5 funções");
    expect(elementProps(badge!).title).toBe("7 pessoas e 5 funções");
  });

  it("names the active resources and the rehearsals counts", () => {
    const tree = renderTabs();
    const resources = findBadge(tree, /recursos/);
    const rehearsals = findBadge(tree, /ensaios/);

    expect(resources).toBeDefined();
    expect(rehearsals).toBeDefined();

    expect(textOf(resources!)).toContain("6 recursos");
    expect(textOf(rehearsals!)).toContain("0 ensaios");
    expect(elementProps(resources!).title).toBe(
      "6 recursos ativos no departamento",
    );
    expect(elementProps(rehearsals!).title).toBe("0 ensaios");
  });

  it("uses the singular when a count is one", () => {
    const tree = renderTabs({
      membersCount: 1,
      functionsCount: 1,
      activeModuleCount: 1,
      rehearsalsCount: 1,
    });

    expect(textOf(findBadge(tree, /pessoas/)!)).toContain("1 pessoa");
    expect(textOf(findBadge(tree, /pessoas/)!)).toContain("1 função");
    expect(textOf(findBadge(tree, /recursos/)!)).toContain("1 recurso");
    expect(textOf(findBadge(tree, /ensaios/)!)).toContain("1 ensaio");
  });
});
