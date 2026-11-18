import { describe, expect, it } from "bun:test";
import {
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import { DepartmentSectionTabs } from "@/components/departments/department-section-tabs";

type TabsProps = {
  showRehearsals?: boolean;
};

function renderTabs(props: TabsProps = {}) {
  return DepartmentSectionTabs({
    showRehearsals: true,
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

  it("renders only an icon and a label in each tab, with no count badges", () => {
    const tree = renderTabs();
    const triggers = findTriggers(tree);
    const badges = collectElements(tree).filter((element) =>
      /pessoas|funções|recursos|ensaios/.test(
        String(elementProps(element)["aria-label"] ?? ""),
      ),
    );

    expect(badges).toHaveLength(0);
    expect(triggers.map((trigger) => textOf(trigger))).toEqual([
      "Equipe & Funções",
      "Configurações & Acesso",
      "Ensaios",
    ]);
  });

  it("hides the rehearsals tab when the department has no rehearsals module", () => {
    const triggers = findTriggers(renderTabs({ showRehearsals: false }));

    expect(triggers).toHaveLength(2);
    expect(
      triggers.some((trigger) => elementProps(trigger).value === "rehearsals"),
    ).toBe(false);
  });
});

