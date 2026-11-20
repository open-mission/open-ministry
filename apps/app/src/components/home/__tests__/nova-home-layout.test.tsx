import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ChurchInfoCard } from "@/components/home/church-info-card";
import { DepartmentsCard } from "@/components/home/departments-card";
import { HomeGrid } from "@/components/home/home-grid";
import { HomeSkeleton } from "@/components/home/home-skeleton";
import { HomeTabs } from "@/components/home/home-tabs";
import { NextServiceCard } from "@/components/home/next-service-card";
import { NotificationsCard } from "@/components/home/notifications-card";
import { TasksCard } from "@/components/home/tasks-card";
import { UpcomingEventsCard } from "@/components/home/upcoming-events-card";
import { VerseCard } from "@/components/home/verse-card";

const verse = {
  dayOfYear: 1,
  passageId: "JHN.3.16",
  reference: "João 3:16",
  content: "Porque Deus amou o mundo de tal maneira.",
  imageUrl: null,
  versionName: "ACF",
};

const event = {
  id: "event-1",
  title: "Culto de domingo",
  startsAt: new Date("2026-11-22T09:00:00"),
  endsAt: new Date("2026-11-22T11:00:00"),
  location: "Sede",
} as unknown as NonNullable<Parameters<typeof NextServiceCard>[0]["event"]>;

const announcements = [
  {
    id: "notice-1",
    type: "announcement",
    title: "Reunião de líderes",
    body: "Encontro após o culto.",
    href: null,
    readAt: null,
    createdAt: new Date("2026-11-19T10:00:00"),
  },
];

const person = (name: string) => ({
  name,
  email: null,
  image: null,
  birthday: null,
  userId: null,
  user: null,
});

describe("layout da nova home", () => {
  it("HomeTabs usa rótulos grandes, indicador verde compacto e borda sutil", () => {
    const markup = renderToStaticMarkup(
      createElement(HomeTabs, { today: "Hoje", church: "Igreja" }),
    );

    expect(markup).toContain("gap-7");
    expect(markup).toContain("border-b border-border/50");
    expect(markup).toContain("text-lg");
    expect(markup).toContain("sm:text-xl");
    expect(markup).toContain("after:h-[3px]");
    expect(markup).toContain("group-data-horizontal/tabs:after:bottom-0");
    expect(markup).toContain("group-data-horizontal/tabs:after:h-[3px]");
    expect(markup).toContain("after:w-9");
    expect(markup).toContain("after:bg-primary");
    expect(markup).toContain("after:rounded-full");
    expect(markup).toContain("min-h-[44px]");
    expect(markup).toContain("Minha Igreja");
  });

  it("HomeSkeleton e HomeGrid refletem o container, o skeleton do header e o grid de 12 colunas", () => {
    const skeleton = renderToStaticMarkup(createElement(HomeSkeleton));
    expect(skeleton).toContain("max-w-6xl");
    expect(skeleton).toContain("gap-8");
    expect(skeleton).toContain("h-10 w-56");
    expect(skeleton).toContain("h-4 w-80");
    expect(skeleton).toContain("gap-7");
    expect(skeleton).toContain("lg:grid-cols-12");
    expect(skeleton).toContain("lg:col-span-7");
    expect(skeleton).toContain("lg:col-span-5");

    const grid = renderToStaticMarkup(
      createElement(HomeGrid, null, "conteúdo"),
    );
    expect(grid).toContain("grid-cols-1 gap-6 lg:grid-cols-12");
  });
});

describe("cards da aba Hoje", () => {
  it("VerseCard reutiliza o card original com gradiente dourado e blur", () => {
    const markup = renderToStaticMarkup(createElement(VerseCard, { verse }));

    expect(markup).toContain(
      "border-border/70 bg-gradient-to-br from-amber-500/[0.04] via-card to-primary/[0.02]",
    );
    expect(markup).toContain("bg-amber-500/10 blur-3xl");
    expect(markup).toContain("Versículo do Dia");
    expect(markup).toContain("ACF • YouVersion");
    expect(markup).toContain("— João 3:16");
    expect(markup).toContain("Copiar");
    expect(markup).toContain("Compartilhar");
    expect(markup).toContain("Abrir na Bíblia");
  });

  it("NextServiceCard transforma o card inteiro em link e remove a ação duplicada", () => {
    const markup = renderToStaticMarkup(
      createElement(NextServiceCard, { event }),
    );

    expect(markup).toContain('href="/dashboard/events/event-1"');
    expect(markup).toContain("border-primary/30");
    expect(markup).toContain("hover:border-primary/50");
    expect(markup).toContain("Culto de domingo");
    expect(markup).toContain("Ver agenda");
    expect(markup).not.toContain("Ver detalhes");
  });

  it("NotificationsCard mantém o cabeçalho dentro do card e sem ação por linha", () => {
    const markup = renderToStaticMarkup(
      createElement(NotificationsCard, { announcements }),
    );

    expect(markup).toContain('aria-labelledby="home-notifications-title"');
    expect(markup).toContain('data-slot="card"');
    expect(markup).toContain("Avisos e notificações");
    expect(markup).toContain("1 novo");
    expect(markup).toContain("bg-accent");
    expect(markup).toContain("text-accent-foreground");
    expect(markup).toContain("Abrir aviso: Reunião de líderes");
    expect(markup).not.toContain("Marcar como lido");
  });

  it("NotificationsCard usa chart-2 para avisos de agenda com contraste no dark mode", () => {
    const markup = renderToStaticMarkup(
      createElement(NotificationsCard, {
        announcements: [
          {
            ...announcements[0],
            id: "notice-schedule",
            type: "schedule",
            title: "Novo horário do culto",
          },
        ],
      }),
    );

    expect(markup).toContain("bg-chart-2");
    expect(markup).not.toContain("bg-secondary");
  });

  it("TasksCard usa checkbox e badge com cores semânticas conforme o prazo", () => {
    const task = {
      id: "task-1",
      title: "Preparar a escala",
      status: "todo",
      deadline: new Date().toISOString(),
    } as unknown as Parameters<typeof TasksCard>[0]["tasks"][number];

    const markup = renderToStaticMarkup(
      createElement(TasksCard, { tasks: [task] }),
    );

    expect(markup).toContain("Minhas Tarefas");
    expect(markup).toContain(
      "Afazeres pessoais e demandas atribuídas a você.",
    );
    expect(markup).toContain("border-accent-foreground");
    expect(markup).toContain("bg-accent text-accent-foreground");
    expect(markup).toContain("Ver todas");
  });
});

describe("cards da aba Minha Igreja", () => {
  it("ChurchInfoCard não tem título externo e mostra endereço e links", () => {
    const markup = renderToStaticMarkup(
      createElement(ChurchInfoCard, {
        organization: { name: "Igreja Central", logo: null },
        churchMeta: {
          description: "Uma comunidade acolhedora.",
          address: "Rua das Flores, 123",
          website: "igreja.org",
          instagram: "@igrejacentral",
          phone: "(11) 99999-0000",
        },
      }),
    );

    expect(markup).toContain('aria-label="Informações da igreja"');
    expect(markup).not.toContain("<h2");
    expect(markup).toContain(
      "border-border/70 bg-gradient-to-br from-amber-500/[0.04] via-card to-primary/[0.02]",
    );
    expect(markup).toContain("bg-amber-500/10 blur-3xl");
    expect(markup).toContain("border-amber-500/30 bg-amber-500/10");
    expect(markup).toContain("text-amber-600 dark:text-amber-400");
    expect(markup).toContain("Endereço");
    expect(markup).toContain("Rua das Flores, 123");
    expect(markup).toContain("https://igreja.org");
    expect(markup).toContain("↗");
    expect(markup).toContain("tel:11999990000");
  });

  it("UpcomingEventsCard traz cabeçalho interno e link discreto de detalhes", () => {
    const markup = renderToStaticMarkup(
      createElement(UpcomingEventsCard, {
        events: [
          {
            id: "ev-1",
            title: "Ensaio",
            startsAt: new Date("2026-11-21T18:00:00"),
            endsAt: new Date("2026-11-21T20:00:00"),
          },
        ],
      }),
    );

    expect(markup).toContain('aria-labelledby="home-upcoming-events-title"');
    expect(markup).toContain("1 próximo");
    expect(markup).toContain("Ensaio");
    expect(markup).toContain('href="/dashboard/events/ev-1"');
    expect(markup).toContain("Detalhes");
    expect(markup).toContain("min-h-[44px]");
  });

  it("UpcomingEventsCard alterna a bolinha entre primary e chart-2", () => {
    const markup = renderToStaticMarkup(
      createElement(UpcomingEventsCard, {
        events: [
          {
            id: "ev-even",
            title: "Ensaio",
            startsAt: new Date("2026-11-21T18:00:00"),
            endsAt: new Date("2026-11-21T20:00:00"),
          },
          {
            id: "ev-odd",
            title: "Culto",
            startsAt: new Date("2026-11-22T09:00:00"),
            endsAt: new Date("2026-11-22T11:00:00"),
          },
        ],
      }),
    );

    expect(markup).toContain("bg-primary");
    expect(markup).toContain("bg-chart-2");
    expect(markup.indexOf("bg-primary")).toBeLessThan(
      markup.indexOf("bg-chart-2"),
    );
  });

  it("DepartmentsCard reutiliza o DepartmentCard original com funções e líderes", () => {
    const markup = renderToStaticMarkup(
      createElement(DepartmentsCard, {
        departments: [
          {
            id: "dep-1",
            name: "Louvor",
            description: null,
            functions: [
              { id: "fn-1", name: "Vocal" },
              { id: "fn-2", name: "Teclado" },
              { id: "fn-3", name: "Bateria" },
              { id: "fn-4", name: "Projeção" },
            ],
            members: [
              { id: "member-1", isLeader: true, person: person("Ana") },
              { id: "member-2", isLeader: true, person: person("João") },
              { id: "member-3", isLeader: false, person: person("Maria") },
            ],
          },
        ],
        pluralLabel: "Departamentos",
      }),
    );

    expect(markup).toContain('href="/dashboard/departments/dep-1"');
    expect(markup).toContain("grid gap-4 sm:grid-cols-2");
    expect(markup).toContain("ring-1 ring-foreground/10");
    expect(markup).toContain("bg-secondary");
    expect(markup).toContain("text-7xl");
    expect(markup).toContain(">L<");
    expect(markup).toContain("Vocal");
    expect(markup).toContain("Sem descrição por enquanto.");
    expect(markup).toContain("+1");
    expect(markup).toContain("3 pessoas");
    expect(markup).toContain("Ana, João");
    expect(markup).toContain("h-full");
  });

  it("DepartmentsCard concorda a contagem de membros e sinaliza a ausência de líder", () => {
    const department = (memberCount: number) => ({
      id: "dep-count",
      name: "Louvor",
      description: null,
      functions: [],
      members: Array.from({ length: memberCount }, (_, index) => ({
        id: `member-${index}`,
        isLeader: false,
        person: person(`Pessoa ${index + 1}`),
      })),
    });

    const singular = renderToStaticMarkup(
      createElement(DepartmentsCard, {
        departments: [department(1)],
      }),
    );
    expect(singular).toContain("1 pessoa");
    expect(singular).not.toContain("1 pessoas");
    expect(singular).toContain("Sem líder");

    const plural = renderToStaticMarkup(
      createElement(DepartmentsCard, {
        departments: [department(3)],
      }),
    );
    expect(plural).toContain("3 pessoas");
    expect(plural).not.toMatch(/3 pessoa(?!s)/);
    expect(plural).toContain("Sem líder");
  });
});
