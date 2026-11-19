import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  HomeCard,
  HomeCardContent,
  HomeListItem,
  HomeSection,
  HomeSectionAction,
  HomeSectionDescription,
  HomeSectionHeader,
  HomeSectionTitle,
} from "@/components/home";
import { departmentAcronym } from "@/components/home/departments-card";

describe("primitivos de composição da home", () => {
  it("HomeSection monta cabeçalho, título, descrição e ação", () => {
    const markup = renderToStaticMarkup(
      createElement(
        HomeSection,
        { "aria-label": "Minha seção" },
        createElement(
          HomeSectionHeader,
          null,
          createElement(HomeSectionTitle, null, "Título"),
          createElement(HomeSectionDescription, null, "Descrição"),
          createElement(HomeSectionAction, null, "Ação"),
        ),
      ),
    );

    expect(markup).toContain("<section");
    expect(markup).toContain('aria-label="Minha seção"');
    expect(markup).toContain("<h2");
    expect(markup).toContain("Título");
    expect(markup).toContain("Descrição");
    expect(markup).toContain("Ação");
  });

  it("HomeCard e HomeCardContent usam os slots do Card shadcn", () => {
    const markup = renderToStaticMarkup(
      createElement(
        HomeCard,
        null,
        createElement(HomeCardContent, null, "Conteúdo"),
      ),
    );

    expect(markup).toContain('data-slot="card"');
    expect(markup).toContain('data-slot="card-content"');
    expect(markup).toContain("Conteúdo");
  });

  it("HomeListItem mostra título, meta e conteúdo à direita", () => {
    const markup = renderToStaticMarkup(
      createElement(HomeListItem, {
        title: "Tarefa da semana",
        meta: "Amanhã",
        trailing: "Concluir",
      }),
    );

    expect(markup).toContain("Tarefa da semana");
    expect(markup).toContain("Amanhã");
    expect(markup).toContain("Concluir");
  });
});

describe("departmentAcronym", () => {
  it("gera siglas a partir das palavras do nome", () => {
    expect(departmentAcronym("Louvor e Adoração")).toBe("LA");
    expect(departmentAcronym("Infantil")).toBe("IN");
    expect(departmentAcronym("")).toBe("–");
  });
});
