import { afterAll, describe, expect, it, mock } from "bun:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ChurchInfoCard } from "@/components/home/church-info-card";
import { DepartmentsCard } from "@/components/home/departments-card";
import { DesktopHomeView } from "@/components/home/desktop-home-view";
import { HomeGrid } from "@/components/home/home-grid";
import { HomeHeaderTabs } from "@/components/home/home-header-tabs";
import { HomeTabProvider } from "@/components/home/home-tab-context";
import { HomeSkeleton } from "@/components/home/home-skeleton";
import { HomeTabs } from "@/components/home/home-tabs";
import { MobileHomeView } from "@/components/home/mobile-home-view";
import { NextAssignmentCard } from "@/components/home/next-assignment-card";
import { NextServiceCard } from "@/components/home/next-service-card";
import { NotificationsCard } from "@/components/home/notifications-card";
import {
  TASK_UNDO_WINDOW_MS,
  TaskCheckbox,
} from "@/components/home/task-checkbox";
import { TasksCard } from "@/components/home/tasks-card";
import { TodayHomeLayout } from "@/components/home/today-home-layout";
import { UpcomingEventsCard } from "@/components/home/upcoming-events-card";
import { VerseCard } from "@/components/home/verse-card";
import { VerseOfTheDayWidget } from "@/components/home/verse-of-the-day-widget";
import { WeekAttentionCard } from "@/components/home/week-attention-card";
import type { BirthdayEntry, CalendarDate } from "@/lib/birthdays";
import type { DepartmentCoverage } from "@/lib/events";
import {
  formatHomeDateLabel,
  getHomeGreeting,
} from "@/lib/home-greeting";
import type { ModuleKey } from "@/lib/modules/types";

// O caminho é controlado pelo roteador do Next; o mock permite renderizar o
// header integrado na home e em rotas comuns sem montar um App Router.
const actualNavigation = await import("next/navigation");

let currentPathname = "/";

mock.module("next/navigation", () => ({
  ...actualNavigation,
  usePathname: () => currentPathname,
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

const { AvailabilityReminderWidget } = await import(
  "@/components/availability/availability-reminder-widget"
);

const {
  HomeAwareHeader,
  HomeAwareHeaderFallback,
  HeaderCenterSlot,
  HeaderUserSlot,
  getHeaderClassName,
  isHeaderScrolled,
} = await import("@/components/app/home-header-slot");

afterAll(() => {
  mock.module("next/navigation", () => ({ ...actualNavigation }));
});

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
  it("HomeHeaderTabs afasta a aba Hoje do logo e usa indicador que preenche a aba", () => {
    const markup = renderToStaticMarkup(createElement(HomeHeaderTabs));

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Visões da página inicial"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain(">Hoje<");
    expect(markup).toContain(">Minha Igreja<");
    expect(markup).toContain('id="home-tab-hoje"');
    expect(markup).toContain('id="home-tab-igreja"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('aria-selected="false"');
    expect(markup).toContain("h-14");
    expect(markup).toContain("min-h-[44px]");
    expect(markup).toContain("gap-6 sm:gap-7");
    expect(markup).toContain("ml-3");
    expect(markup).toContain("md:ml-1");
    expect(markup).toContain("after:h-[3px]");
    expect(markup).toContain("after:w-full");
    expect(markup).not.toContain("after:w-9");
    expect(markup).not.toContain("after:mx-auto");
    expect(markup).toContain("after:bg-primary");
    expect(markup).toContain("after:rounded-full");
    expect(markup).toContain("font-semibold text-foreground");
    expect(markup).toContain("text-muted-foreground hover:text-foreground");
  });

  it("HomeTabs renderiza apenas o painel ativo compartilhado pelo HomeTabProvider", () => {
    const markup = renderToStaticMarkup(
      createElement(
        HomeTabProvider,
        null,
        createElement(HomeTabs, {
          today: "CONTEUDO_HOJE",
          church: "CONTEUDO_IGREJA",
        }),
      ),
    );

    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain('id="home-panel-hoje"');
    expect(markup).toContain('aria-labelledby="home-tab-hoje"');
    expect(markup).toContain("CONTEUDO_HOJE");
    expect(markup).not.toContain("CONTEUDO_IGREJA");
    expect(markup).not.toContain('role="tablist"');
  });

  it("HomeTabs fora do provider usa Hoje como fallback", () => {
    const markup = renderToStaticMarkup(
      createElement(HomeTabs, {
        today: "CONTEUDO_HOJE",
        church: "CONTEUDO_IGREJA",
      }),
    );

    expect(markup).toContain('id="home-panel-hoje"');
    expect(markup).toContain("CONTEUDO_HOJE");
    expect(markup).not.toContain("CONTEUDO_IGREJA");
  });

  it("HomeSkeleton espelha a geometria mobile/tablet e o caderno desktop", () => {
    const skeleton = renderToStaticMarkup(createElement(HomeSkeleton));
    expect(skeleton).toContain("max-w-6xl");
    expect(skeleton).toContain("lg:hidden");
    expect(skeleton).toContain("hidden flex-col gap-7 lg:flex");
    expect(skeleton).not.toContain("role=\"tablist\"");
    expect(skeleton).not.toContain("h-10 w-56");
    expect(skeleton).toContain("md:grid-cols-2");
    expect(skeleton).toContain("md:items-stretch");
    expect(skeleton).not.toContain("@container");
    expect(skeleton).toContain("lg:grid-cols-[minmax(0,1fr)_316px]");
    expect(skeleton).toContain("xl:grid-cols-[minmax(0,1fr)_360px]");

    const grid = renderToStaticMarkup(
      createElement(HomeGrid, null, "conteúdo"),
    );
    expect(grid).toContain("grid-cols-1 gap-6 lg:grid-cols-12");
  });
});

describe("header integrado da home", () => {
  it("isHeaderScrolled usa o limite de 4px de rolagem", () => {
    expect(isHeaderScrolled(0)).toBe(false);
    expect(isHeaderScrolled(4)).toBe(false);
    expect(isHeaderScrolled(5)).toBe(true);
  });

  it("mantém mt-2 e header sem borda inferior na home antes de rolar", () => {
    const className = getHeaderClassName(true, false);

    expect(className).toContain("sticky");
    expect(className).toContain("top-0");
    expect(className).toContain("z-20");
    expect(className).toContain("border-0");
    expect(className).toContain("mt-2");
    expect(className).toContain("transition-colors");
    expect(className).toContain("duration-200");
    expect(className).not.toContain("border-b");
    expect(className).not.toContain("border-border");
  });

  it("mantém o header da home sem borda inferior ao rolar, sem perder mt-2", () => {
    const className = getHeaderClassName(true, true);

    expect(className).toContain("mt-2");
    expect(className).toContain("border-0");
    expect(className).toContain("transition-colors");
    expect(className).not.toContain("border-b");
    expect(className).not.toContain("border-border");
  });

  it("aplica o header minimalista sem borda inferior e sem mt-2 nas demais rotas", () => {
    const className = getHeaderClassName(false, true);

    expect(className).toContain("border-0");
    expect(className).toContain("lg:h-11");
    expect(className).toContain("lg:min-h-0");
    expect(className).toContain("lg:pt-1.5");
    expect(className).not.toContain("border-b");
    expect(className).not.toContain("border-border");
    expect(className).not.toContain("mt-2");
    expect(className).not.toContain("transition-colors");
  });

  it("HomeAwareHeader renderiza o header da home com margem e sem borda inferior", () => {
    currentPathname = "/";

    const markup = renderToStaticMarkup(
      createElement(
        HomeAwareHeader,
        null,
        createElement("span", null, "CONTEUDO_HEADER"),
      ),
    );

    expect(markup).toContain("<header");
    expect(markup).toContain("mt-2");
    expect(markup).toContain("border-0");
    expect(markup).not.toContain("border-b");
    expect(markup).toContain("sticky");
    expect(markup).toContain("CONTEUDO_HEADER");
  });

  it("HomeAwareHeader mantém header minimalista sem borda e sem margem extra fora da home", () => {
    currentPathname = "/dashboard";

    const markup = renderToStaticMarkup(
      createElement(
        HomeAwareHeader,
        null,
        createElement("span", null, "CONTEUDO_HEADER"),
      ),
    );

    expect(markup).toContain("<header");
    expect(markup).toContain("border-0");
    expect(markup).toContain("lg:h-11");
    expect(markup).not.toContain("border-b");
    expect(markup).not.toContain("border-border");
    expect(markup).not.toContain("mt-2");
    expect(markup).toContain("CONTEUDO_HEADER");
  });

  it("HomeAwareHeaderFallback é um header estático, sem pathname e sem conteúdo de loaders", () => {
    currentPathname = "/";
    const onHome = renderToStaticMarkup(createElement(HomeAwareHeaderFallback));
    currentPathname = "/dashboard";
    const onDashboard = renderToStaticMarkup(
      createElement(HomeAwareHeaderFallback),
    );

    // O fallback não consulta o pathname: o markup é idêntico em qualquer rota.
    expect(onDashboard).toBe(onHome);
    expect(onHome).toContain("<header");
    expect(onHome).toContain("sticky");
    expect(onHome).toContain("border-0");
    expect(onHome).not.toContain("border-b");
    expect(onHome).not.toContain("border-border");
    expect(onHome).not.toContain("mt-2");

    // Esqueletos leves no lugar dos loaders reais.
    expect(onHome).toContain("animate-pulse");
    expect(onHome).toContain("bg-muted");
    expect(onHome).toContain("ml-auto");

    // Não duplica abas, breadcrumb, sino nem avatar vindos dos loaders.
    expect(onHome).not.toContain('role="tablist"');
    expect(onHome).not.toContain(">Hoje<");
    expect(onHome).not.toContain(">Minha Igreja<");
    expect(onHome).not.toContain("CONTEUDO_HEADER");
    expect(onHome).not.toContain("HomeHeaderTabs");
    expect(onHome).not.toContain("DashboardBreadcrumb");
    expect(onHome).not.toContain("NotificationBell");
    expect(onHome).not.toContain("UserMenu");
  });

  it("o layout passa HomeAwareHeaderFallback sem filhos e não duplica headerContent", async () => {
    const layout = await Bun.file(
      new URL("../../../app/(app)/layout.tsx", import.meta.url),
    ).text();

    expect(layout).toContain("fallback={<HomeAwareHeaderFallback />}");
    expect(layout).not.toMatch(
      /<HomeAwareHeaderFallback>[\s\S]*?<\/HomeAwareHeaderFallback>/,
    );
    expect(layout).toMatch(
      /<HomeAwareHeader>\{headerContent\}<\/HomeAwareHeader>/,
    );
    expect(layout.match(/\{headerContent\}/g) ?? []).toHaveLength(1);
    expect(layout).not.toContain('Separator\n          orientation="vertical"');
  });

  it("HeaderCenterSlot fica vazio na home (sem abas), oculta breadcrumb no desktop e retorna vazio na agenda", () => {
    currentPathname = "/";
    const onHome = renderToStaticMarkup(
      createElement(
        HeaderCenterSlot,
        null,
        createElement("span", null, "BREADCRUMB"),
      ),
    );
    expect(onHome).toBe("");
    expect(onHome).not.toContain("Hoje");
    expect(onHome).not.toContain("Minha Igreja");

    currentPathname = "/dashboard/events";
    const onEvents = renderToStaticMarkup(
      createElement(
        HeaderCenterSlot,
        null,
        createElement("span", null, "BREADCRUMB"),
      ),
    );
    expect(onEvents).toContain("lg:hidden");
    expect(onEvents).toContain("BREADCRUMB");

    currentPathname = "/dashboard/calendar";
    const onCalendar = renderToStaticMarkup(
      createElement(
        HeaderCenterSlot,
        null,
        createElement("span", null, "BREADCRUMB"),
      ),
    );
    expect(onCalendar).toBe("");
  });

  it("HomeAwareHeader marca data-calendar-active só nas rotas de Agenda, evitando lock órfão do Activity na home", () => {
    currentPathname = "/calendar";
    const onCalendar = renderToStaticMarkup(
      createElement(
        HomeAwareHeader,
        null,
        createElement("span", null, "ACTIONS"),
      ),
    );
    expect(onCalendar).toContain("data-calendar-active");

    currentPathname = "/";
    const onHome = renderToStaticMarkup(
      createElement(
        HomeAwareHeader,
        null,
        createElement("span", null, "ACTIONS"),
      ),
    );
    expect(onHome).not.toContain("data-calendar-active");
  });

  it("HeaderUserSlot mantém avatar visível no header em todas as rotas (inclusive desktop e agenda)", () => {
    for (const path of ["/", "/dashboard/events", "/dashboard/calendar"]) {
      currentPathname = path;
      const markup = renderToStaticMarkup(
        createElement(
          HeaderUserSlot,
          null,
          createElement("button", null, "AVATAR_USER"),
        ),
      );
      expect(markup).toContain("AVATAR_USER");
      expect(markup).not.toContain("md:hidden");
    }
  });
});

describe("cards da aba Hoje", () => {
  it("VerseCard delega ao widget com etiqueta YouVersion, citação e arte pastoral", () => {
    const markup = renderToStaticMarkup(createElement(VerseCard, { verse }));

    expect(markup).toContain('aria-label="Abrir versículo do dia: João 3:16"');
    expect(markup).toContain("Versículo · YouVersion");
    expect(markup).toContain("Ver arte ›");
    expect(markup).toContain("Porque Deus amou o mundo de tal maneira.");
    expect(markup).toContain("João 3:16 · ACF");
    expect(markup).toContain("bg-[#1e472f]");
    expect(markup).toContain("<svg");
    expect(markup).toContain("rounded-lg size-12");
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

    expect(markup).toContain("Minhas tarefas");
    expect(markup).toContain(">1<");
    expect(markup).not.toContain(
      "Afazeres pessoais e demandas atribuídas a você.",
    );
    expect(markup).toContain("border-accent-foreground");
    expect(markup).toContain("bg-accent text-accent-foreground");
    expect(markup).toContain("Ver todas");
  });

  it("TasksCard expõe botão clicável para abrir os detalhes da tarefa", () => {
    const task = {
      id: "task-1",
      title: "Preparar a escala",
      status: "todo",
      deadline: null,
    } as unknown as Parameters<typeof TasksCard>[0]["tasks"][number];

    const markup = renderToStaticMarkup(
      createElement(TasksCard, { tasks: [task] }),
    );

    expect(markup).toContain(
      'aria-label="Abrir detalhes da tarefa: Preparar a escala"',
    );
    expect(markup).toContain("hover:text-primary");
    expect(markup).toContain("focus-visible:ring-2");
    expect(markup).toContain("Preparar a escala");
  });

  it("TasksCard folio integra a lista sem card externo e usa link /tasks", () => {
    const task = {
      id: "task-1",
      title: "Preparar a escala",
      status: "todo",
      deadline: null,
    } as unknown as Parameters<typeof TasksCard>[0]["tasks"][number];

    const markup = renderToStaticMarkup(
      createElement(TasksCard, { tasks: [task], variant: "folio" }),
    );

    expect(markup).toContain("Minhas tarefas (1)");
    expect(markup).toContain("whitespace-nowrap");
    expect(markup).toContain('href="/tasks"');
    expect(markup).toContain("divide-y divide-border/70");
    expect(markup).toContain("truncate");
    expect(markup).not.toContain('data-slot="card"');
  });

  it("TasksCard mostra estado vazio acolhedor quando showEmptyState", () => {
    const markup = renderToStaticMarkup(
      createElement(TasksCard, { tasks: [], showEmptyState: true }),
    );

    expect(markup).toContain("Tudo em dia nas tarefas");
    expect(markup).toContain("Crie um lembrete pessoal quando precisar.");
    expect(markup).toContain("Nova");
    expect(markup).toContain("min-h-11");
    expect(markup).toContain("lg:min-h-9");
    expect(markup).not.toContain("sm:min-h-9");
  });

  it("TasksCard continua oculto sem tarefas quando showEmptyState é falso", () => {
    const markup = renderToStaticMarkup(
      createElement(TasksCard, { tasks: [] }),
    );

    expect(markup).toBe("");
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

const assignment = {
  id: "assignment-1",
  departmentId: "dep-1",
  functionId: "fn-1",
  personId: "person-1",
  department: { id: "dep-1", name: "Louvor" },
  function: { id: "fn-1", name: "Vocal" },
  schedule: {
    id: "schedule-1",
    event: {
      id: "event-1",
      title: "Culto de domingo",
      startsAt: new Date("2026-11-22T09:00:00"),
      endsAt: new Date("2026-11-22T11:00:00"),
      location: "Sede",
    },
  },
} as unknown as NonNullable<
  Parameters<typeof NextAssignmentCard>[0]["assignment"]
>;

const coverageWithGap: DepartmentCoverage[] = [
  {
    departmentId: "dep-1",
    departmentName: "Louvor",
    eventsCount: 2,
    totalSlots: 6,
    coveredSlots: 4,
    eventsWithGaps: 1,
    nextGap: {
      eventId: "event-1",
      eventTitle: "Culto de domingo",
      startsAt: new Date("2026-11-22T09:00:00"),
      missingFunctions: ["Teclado", "Bateria"],
    },
  },
];

describe("VerseOfTheDayWidget", () => {
  it("mantém a citação em 2 linhas e área de toque de 44px nas variantes card/compact", () => {
    for (const variant of ["card", "compact", "full"] as const) {
      const markup = renderToStaticMarkup(
        createElement(VerseOfTheDayWidget, { verse, variant }),
      );

      expect(markup).toContain("line-clamp-2");
      expect(markup).toContain("font-heading");
      expect(markup).toContain("italic");
      expect(markup).toContain("min-h-11");
      expect(markup).toContain("text-[11px]");
      expect(markup).not.toContain("text-[10px]");
      expect(markup).not.toContain("blur-3xl");
    }
  });

  it("usa miniatura de 52px na variante folio", () => {
    const markup = renderToStaticMarkup(
      createElement(VerseOfTheDayWidget, { verse, variant: "folio" }),
    );

    expect(markup).toContain("size-[52px]");
    expect(markup).toContain("Ver arte ›");
  });

  it("renderiza a imagem do YouVersion quando existe imageUrl", () => {
    const markup = renderToStaticMarkup(
      createElement(VerseOfTheDayWidget, {
        verse: { ...verse, imageUrl: "https://example.com/verse.jpg" },
        variant: "card",
      }),
    );

    expect(markup).toContain('src="https://example.com/verse.jpg"');
    expect(markup).toContain('loading="eager"');
    expect(markup).toContain("object-cover");
    expect(markup).toContain("bg-secondary");
  });

  it("nunca deixa caixa vazia: sem imageUrl cai na arte pastoral em SVG", () => {
    const markup = renderToStaticMarkup(
      createElement(VerseOfTheDayWidget, { verse, variant: "card" }),
    );

    expect(markup).toContain("<svg");
    expect(markup).toContain("#c9a24b");
    expect(markup).not.toContain("<img");
  });

  it("mantém o painel de arte sempre montado com aviso de carregamento e imagem eager", async () => {
    const source = await Bun.file(
      new URL("../verse-of-the-day-widget.tsx", import.meta.url),
    ).text();

    expect(source).toContain('"relative aspect-video w-full overflow-hidden');
    expect(source).toContain("Carregando imagem do YouVersion...");
    expect(source).toContain('loading="eager"');
    expect(source).toContain("node.complete && node.naturalWidth > 0");
    expect(source).toContain("opacity-0");
    expect(source).toContain("opacity-100");
    expect(source).toContain("sm:max-w-[700px]");
    expect(source).toContain("sm:grid-cols-[260px_1fr]");
    expect(source).toContain("sm:aspect-square");
    expect(source).toContain("sm:items-center sm:justify-center");
  });
});

describe("NextAssignmentCard", () => {
  it("mostra a próxima escala com CTA de 44px e link secundário", () => {
    const markup = renderToStaticMarkup(
      createElement(NextAssignmentCard, { assignment }),
    );

    expect(markup).toContain("Sua próxima escala");
    expect(markup).toContain("Culto de domingo");
    expect(markup).toContain("Louvor");
    expect(markup).toContain("Vocal");
    expect(markup).toContain("Sede");
    expect(markup).toContain("Ver minha escala");
    expect(markup).toContain('href="/dashboard/events/event-1"');
    expect(markup).toContain('href="/dashboard/schedules"');
    expect(markup).toContain("Minhas escalas");
    expect(markup).toContain("min-h-[44px]");
    expect(markup).toContain("w-full sm:w-auto");
    expect(markup).not.toContain("Confirmar presença");
  });

  it("não renderiza nada sem escala futura", () => {
    const markup = renderToStaticMarkup(
      createElement(NextAssignmentCard, { assignment: null }),
    );

    expect(markup).toBe("");
  });
});

describe("WeekAttentionCard", () => {
  it("fica oculto para quem não lidera, mesmo com vagas", () => {
    const markup = renderToStaticMarkup(
      createElement(WeekAttentionCard, {
        departments: coverageWithGap,
        canManage: false,
      }),
    );

    expect(markup).toBe("");
  });

  it("fica oculto quando não há vagas em aberto", () => {
    const markup = renderToStaticMarkup(
      createElement(WeekAttentionCard, {
        departments: [
          {
            ...coverageWithGap[0],
            eventsWithGaps: 0,
            nextGap: null,
          },
        ],
        canManage: true,
      }),
    );

    expect(markup).toBe("");
  });

  it("aparece para a liderança com até 3 pendências sem duplicar aviso de disponibilidade", () => {
    const markup = renderToStaticMarkup(
      createElement(WeekAttentionCard, {
        departments: coverageWithGap,
        canManage: true,
      }),
    );

    expect(markup).toContain("Atenção da semana");
    expect(markup).toContain("Louvor");
    expect(markup).toContain("Culto de domingo");
    expect(markup).toContain("Teclado, Bateria");
    expect(markup).toContain('href="/dashboard/events/event-1"');
    expect(markup).not.toContain("Informe sua disponibilidade");
  });

  it("limita a lista a 3 pendências", () => {
    const many: DepartmentCoverage[] = Array.from({ length: 5 }, (_, index) => ({
      ...coverageWithGap[0],
      departmentId: `dep-${index}`,
      departmentName: `Departamento ${index}`,
      nextGap: {
        eventId: `event-${index}`,
        eventTitle: `Encontro ${index}`,
        startsAt: new Date(`2026-11-2${index + 1}T09:00:00`),
        missingFunctions: ["Vocal"],
      },
    }));

    const markup = renderToStaticMarkup(
      createElement(WeekAttentionCard, {
        departments: many,
        canManage: true,
      }),
    );

    expect(markup.match(/href="\/dashboard\/events\/event-/g) ?? []).toHaveLength(
      3,
    );
  });
});

describe("TodayHomeLayout", () => {
  const renderLayout = (overrides: Record<string, unknown> = {}) =>
    renderToStaticMarkup(
      createElement(TodayHomeLayout, {
        mobileVerse: "MOBILE_VERSE",
        nextAssignment: "NEXT_ASSIGNMENT",
        tasks: "TASKS",
        notifications: "NOTIFICATIONS",
        weekAttention: "ATTENTION",
        nextEvent: "NEXT_EVENT",
        desktopVerse: "DESKTOP_VERSE",
        birthdays: "BIRTHDAYS",
        ...overrides,
      }),
    );

  it("usa 12 colunas no desktop com colunas 7 e 5", () => {
    const markup = renderLayout();

    expect(markup).toContain("lg:grid-cols-12");
    expect(markup).toContain("lg:col-span-7");
    expect(markup).toContain("lg:col-span-5");
    expect(markup).toContain(
      "contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6",
    );
    expect(markup).toContain(
      "contents lg:col-span-5 lg:flex lg:flex-col lg:gap-6",
    );
  });

  it("ordena o mobile e volta à ordem natural do desktop", () => {
    const markup = renderLayout();

    expect(markup).toContain('class="order-1 lg:hidden">MOBILE_VERSE');
    expect(markup).toContain('class="order-2 lg:order-none">NEXT_ASSIGNMENT');
    expect(markup).toContain('class="order-3 lg:order-none">TASKS');
    expect(markup).toContain('class="order-4 lg:order-none">NOTIFICATIONS');
    expect(markup).toContain('class="order-5 lg:order-none">ATTENTION');
    expect(markup).toContain('class="order-6 lg:order-none">NEXT_EVENT');
    expect(markup).toContain('class="order-7 lg:order-none">BIRTHDAYS');
    expect(markup).toContain(
      'class="hidden lg:order-none lg:block">DESKTOP_VERSE',
    );
  });

  it("monta cada bloco uma única vez", () => {
    const markup = renderLayout();

    for (const marker of [
      "MOBILE_VERSE",
      "NEXT_ASSIGNMENT",
      "TASKS",
      "NOTIFICATIONS",
      "ATTENTION",
      "NEXT_EVENT",
      "DESKTOP_VERSE",
      "BIRTHDAYS",
    ]) {
      expect(markup.match(new RegExp(marker, "g")) ?? []).toHaveLength(1);
    }
  });

  it("não cria slots vazios quando um bloco não existe", () => {
    const markup = renderLayout({
      weekAttention: null,
      nextEvent: null,
      birthdays: null,
    });

    expect(markup).not.toContain("order-5");
    expect(markup).not.toContain("order-6");
    expect(markup).not.toContain("order-7");
    expect(markup).toContain("NEXT_ASSIGNMENT");
  });

  it("renderiza availabilityReminder logo após nextAssignment quando informado", () => {
    const markup = renderLayout({
      availabilityReminder: "AVAILABILITY_REMINDER",
    });

    expect(markup).toContain("AVAILABILITY_REMINDER");
    expect(markup.indexOf("NEXT_ASSIGNMENT")).toBeLessThan(
      markup.indexOf("AVAILABILITY_REMINDER"),
    );
  });
});

describe("AvailabilityReminderWidget e Departamentos", () => {
  it("mostra widget minimalista quando disponibilidade não foi salva e oculta após salvar ou sem permissão", () => {
    const homeMarkup = renderToStaticMarkup(
      createElement(AvailabilityReminderWidget, {
        variant: "home",
        hasSaved: false,
        canManageAvailability: true,
      }),
    );
    expect(homeMarkup).toContain("Disponibilidade do dia a dia pendente");
    expect(homeMarkup).toContain("Configurar");
    expect(homeMarkup).toContain("min-h-11");
    expect(homeMarkup).toContain("lg:min-h-9");
    expect(homeMarkup).toContain("sm:w-auto");
    expect(homeMarkup).not.toContain("lg:w-auto");
    expect(homeMarkup).not.toContain("sm:min-h-9");

    const deptMarkup = renderToStaticMarkup(
      createElement(AvailabilityReminderWidget, {
        variant: "departments",
        hasSaved: false,
        canManageAvailability: true,
      }),
    );
    expect(deptMarkup).toContain(
      "Sua disponibilidade semanal ainda não foi configurada",
    );
    expect(deptMarkup).toContain("Configurar agora");

    expect(
      renderToStaticMarkup(
        createElement(AvailabilityReminderWidget, {
          variant: "home",
          hasSaved: true,
          canManageAvailability: true,
        }),
      ),
    ).toBe("");

    expect(
      renderToStaticMarkup(
        createElement(AvailabilityReminderWidget, {
          variant: "home",
          hasSaved: false,
          canManageAvailability: false,
        }),
      ),
    ).toBe("");
  });

  it("desktop-pill mostra a disponibilidade pendente em pill discreta e clicável", () => {
    const markup = renderToStaticMarkup(
      createElement(AvailabilityReminderWidget, {
        variant: "desktop-pill",
        hasSaved: false,
        canManageAvailability: true,
      }),
    );

    expect(markup).toContain("Disponibilidade pendente · Configurar");
    expect(markup).toContain("rounded-full");
    expect(markup).toContain("min-h-7");
    expect(markup).toContain("→");
    expect(
      renderToStaticMarkup(
        createElement(AvailabilityReminderWidget, {
          variant: "desktop-pill",
          hasSaved: true,
          canManageAvailability: true,
        }),
      ),
    ).toBe("");
  });

  it("usa Sheet de 50% no desktop, Drawer no mobile e verifica permissão no servidor", async () => {
    const [sheetSource, actionSource, deptPageSource] = await Promise.all([
      Bun.file(
        new URL("../../availability/availability-sheet.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL("../../../app/actions/availability.ts", import.meta.url),
      ).text(),
      Bun.file(
        new URL(
          "../../../app/(app)/dashboard/departments/page.tsx",
          import.meta.url,
        ),
      ).text(),
    ]);

    expect(sheetSource).toContain(
      "data-[side=right]:md:!w-1/2 data-[side=right]:md:!max-w-[50vw]",
    );
    expect(sheetSource).toContain("rounded-t-xl border-x-0 border-b-0 bg-popover");
    expect(actionSource).toContain(
      'requirePermission("schedules", "manageOwnAvailability")',
    );
    expect(deptPageSource).toContain("participatedDepartments");
    expect(deptPageSource).not.toContain("DomainSubtabs");
  });
});

const baseMobileProps = {
  organizationName: "Igreja Central",
  greeting: "Boa tarde",
  firstName: "Ana",
  nextAssignment: assignment,
  featuredEvent: event,
  canManageOwnAvailability: false,
  availability: null,
  canManageSchedules: false,
  weekCoverage: [] as DepartmentCoverage[],
  accessibleModuleKeys: ["agenda", "schedules"] as ModuleKey[],
  notifications: announcements,
  events: [event],
  tasksSlot: "TASKS_SLOT",
  verseSlot: "VERSE_SLOT",
};

function renderMobile(
  overrides: Partial<ComponentProps<typeof MobileHomeView>> = {},
) {
  return renderToStaticMarkup(
    createElement(MobileHomeView, { ...baseMobileProps, ...overrides }),
  );
}

describe("MobileHomeView (Direção A)", () => {
  it("abre com saudação e nome da igreja, sem duplicar sino/avatar, e oculta header quando integrado", () => {
    const markup = renderMobile();

    expect(markup).toContain("Igreja Central");
    expect(markup).toContain("Boa tarde, Ana");
    expect(markup).toContain("font-heading text-2xl");
    expect(markup).toContain("text-[11px]");
    expect(markup).not.toContain("text-[10px]");
    expect(markup).not.toContain("BellIcon");

    const integrated = renderMobile({ hideHeader: true });
    expect(integrated).not.toContain("<header");
    expect(integrated).not.toContain("Boa tarde, Ana");
  });

  it("destaca a próxima escala no hero verde-floresta com pill translúcida e CTA de 44px", () => {
    const markup = renderMobile();

    expect(markup).toContain("Sua próxima escala");
    expect(markup).toContain("bg-white/12");
    expect(markup).toContain("bg-[#9ec8ab]");
    expect(markup).toContain("bg-[#1e472f]");
    expect(markup).toContain("dark:bg-[#1a3c28]");
    expect(markup).toContain("text-[#faf7ee]");
    expect(markup).toContain("Abrir minha escala");
    expect(markup).toContain('href="/dashboard/events/event-1"');
    expect(markup).toContain("min-h-11");
    expect(markup).toContain("Louvor · Vocal");
  });

  it("mostra 4 atalhos 2x2 horizontais ao lado do hero no tablet quando music está acessível", () => {
    const markup = renderMobile({
      accessibleModuleKeys: ["agenda", "schedules", "music"],
    });

    expect(markup).toContain("grid gap-2 md:grid-cols-2 grid-cols-4");
    expect(markup).toContain("grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch");
    expect(markup).toContain("md:flex-row");
    expect(markup).toContain('href="/schedules"');
    expect(markup).toContain("Minhas escalas");
    expect(markup).toContain('href="/calendar"');
    expect(markup).toContain('href="/songs"');
    expect(markup).toContain("Repertório");
    expect(markup).toContain('href="/tasks"');
    expect(markup).toContain("Minhas tarefas");
  });

  it("esconde Repertório, expande o 3º atalho no tablet e usa 3 colunas no mobile", () => {
    const markup = renderMobile();

    expect(markup).toContain("grid gap-2 md:grid-cols-2 grid-cols-3");
    expect(markup).toContain("md:col-span-2");
    expect(markup).not.toContain('href="/songs"');
    expect(markup).not.toContain("Repertório");
  });

  it("cai no próximo encontro da igreja quando não há escala", () => {
    const markup = renderMobile({ nextAssignment: null });

    expect(markup).toContain("Próximo encontro da igreja");
    expect(markup).toContain("Culto de domingo");
    expect(markup).toContain("Ver detalhes");
  });

  it("mostra primeiros passos no primeiro acesso com CTA conforme permissão", () => {
    const managing = renderMobile({
      nextAssignment: null,
      featuredEvent: null,
      canManageOwnAvailability: true,
    });
    expect(managing).toContain("Primeiros passos");
    expect(managing).toContain("Nenhuma escala agendada ainda");
    expect(managing).toContain("Configurar disponibilidade");
    expect(managing).toContain('href="/availability"');

    const member = renderMobile({
      nextAssignment: null,
      featuredEvent: null,
      canManageOwnAvailability: false,
    });
    expect(member).toContain("Abrir agenda");
    expect(member).toContain('href="/calendar"');
  });

  it("mostra disponibilidade pendente, atenção da semana e aviso não lido", () => {
    const markup = renderMobile({
      canManageOwnAvailability: true,
      availability: { hasSaved: false },
      canManageSchedules: true,
      weekCoverage: coverageWithGap,
    });

    expect(markup).toContain("Disponibilidade do dia a dia pendente");
    expect(markup).toContain("Atenção da semana");
    expect(markup).toContain("Aviso não lido ·");
    expect(markup).toContain("Reunião de líderes");
    expect(markup).toContain("TASKS_SLOT");
    expect(markup).toContain("VERSE_SLOT");
  });

  it("tem estado vazio calmo para próximos eventos", () => {
    const markup = renderMobile({ events: [] });

    expect(markup).toContain("Nenhum evento próximo");
    expect(markup).toContain('href="/calendar"');
  });
});

const todayCalendar: CalendarDate = { year: 2026, month: 11, day: 24 };

const birthday: BirthdayEntry = {
  personId: "person-1",
  userId: null,
  name: "Maria Silva",
  image: null,
  phone: null,
  month: 11,
  day: 28,
  dateLabel: "28 de novembro",
  monthLabel: "Novembro",
  daysUntil: 4,
  isToday: false,
  isTomorrow: false,
  birthYear: null,
  turningAge: null,
};

const baseDesktopProps = {
  organizationName: "Igreja Central",
  greeting: "Boa tarde",
  firstName: "Ana",
  dateLabel: "Terça-feira, 24 de novembro",
  nextAssignment: assignment,
  featuredEvent: event,
  canManageOwnAvailability: false,
  availability: null,
  canManageSchedules: false,
  weekCoverage: [] as DepartmentCoverage[],
  notifications: announcements,
  events: [event],
  birthdays: [] as BirthdayEntry[],
  today: todayCalendar,
  tasksSlot: "TASKS_SLOT",
  verseSlot: "VERSE_SLOT",
};

function renderDesktop(
  overrides: Partial<ComponentProps<typeof DesktopHomeView>> = {},
) {
  return renderToStaticMarkup(
    createElement(DesktopHomeView, { ...baseDesktopProps, ...overrides }),
  );
}

describe("DesktopHomeView (Opção A — Caderno Pastoral)", () => {
  it("tem cabeçalho editorial com data, igreja e saudação, sem abas", () => {
    const markup = renderDesktop();

    expect(markup).toContain("Terça-feira, 24 de novembro · Igreja Central");
    expect(markup).toContain("Boa tarde, Ana");
    expect(markup).toContain("font-heading text-[30px]");
    expect(markup).toContain("text-primary");
    expect(markup).not.toContain('role="tablist"');
    expect(markup).not.toContain("Hoje");
    expect(markup).not.toContain("Minha Igreja");
  });

  it("usa grade de fração + fólio fixo (316px em lg, 360px em xl) com papel aberto", () => {
    const markup = renderDesktop();

    expect(markup).toContain("lg:grid-cols-[minmax(0,1fr)_316px]");
    expect(markup).toContain("xl:grid-cols-[minmax(0,1fr)_360px]");
    expect(markup).toContain("lg:gap-6");
    expect(markup).toContain("xl:gap-8");
    expect(markup).not.toContain("col-span-7");
    expect(markup).not.toContain("xl:col-span-4");
    expect(markup).toContain("rounded-[18px]");
    expect(markup).toContain("bg-muted/65");
    expect(markup).toContain("divide-y divide-border/70");
    expect(markup).toContain("TASKS_SLOT");
    expect(markup).toContain("VERSE_SLOT");
  });

  it("traz o hero da escala com CTA principal e link secundário", () => {
    const markup = renderDesktop();

    expect(markup).toContain("Sua próxima escala");
    expect(markup).toContain("Abrir minha escala");
    expect(markup).toContain("Ver todas as escalas");
    expect(markup).toContain('href="/schedules"');
    expect(markup).toContain("bg-[#1e472f]");
    expect(markup).toContain("dark:border-[#2c5b3f]");
  });

  it("mostra atenção da semana para liderança com até 3 pendências", () => {
    const markup = renderDesktop({
      canManageSchedules: true,
      weekCoverage: coverageWithGap,
    });

    expect(markup).toContain("Atenção da semana");
    expect(markup).toContain("Gerenciar escalas");
    expect(markup).toContain("Falta: Teclado, Bateria");
    expect(markup).toContain("Preencher");
  });

  it("lista os próximos encontros com link para a agenda completa", () => {
    const markup = renderDesktop();

    expect(markup).toContain("Próximos encontros da igreja");
    expect(markup).toContain("Agenda completa");
    expect(markup).toContain('href="/calendar"');
    expect(markup).toContain("Culto de domingo");
  });

  it("mostra a pill de disponibilidade e aniversariantes do mês quando aplicável", () => {
    const markup = renderDesktop({
      canManageOwnAvailability: true,
      availability: { hasSaved: false },
      birthdays: [birthday],
    });

    expect(markup).toContain("Disponibilidade pendente · Configurar");
    expect(markup).toContain("Aniversariantes do mês");
    expect(markup).toContain("Maria Silva");
    expect(markup).toContain('href="/dashboard/birthdays"');
  });

  it("oculta avisos e aniversariantes quando não há dados", () => {
    const markup = renderDesktop({
      notifications: [],
      birthdays: [],
    });

    expect(markup).not.toContain("Avisos não lidos");
    expect(markup).not.toContain("Aniversariantes do mês");
  });
});

describe("TaskCheckbox com desfazer de 8s", () => {
  it("usa checkbox circular com área de toque de 44px", () => {
    const markup = renderToStaticMarkup(
      createElement(TaskCheckbox, {
        taskId: "task-1",
        initialStatus: "todo",
        label: "Preparar a escala",
      }),
    );

    expect(markup).toContain("rounded-full");
    expect(markup).toContain("min-h-11");
    expect(markup).toContain("min-w-11");
    expect(markup).toContain('aria-label="Concluir tarefa: Preparar a escala"');
  });

  it("define a janela de arrependimento em 8s e oferece a ação Desfazer", async () => {
    const source = await Bun.file(
      new URL("../task-checkbox.tsx", import.meta.url),
    ).text();

    expect(TASK_UNDO_WINDOW_MS).toBe(8000);
    expect(source).toContain("duration: TASK_UNDO_WINDOW_MS");
    expect(source).toContain('label: "Desfazer"');
    expect(source).toContain('toast("Tarefa concluída"');
    expect(source).toContain('updateTaskStatusAction(taskId, previous)');
    expect(source).toContain('updateTaskStatusAction(taskId, nextStatus)');
  });
});

describe("saudação e data da home", () => {
  it("cumprimenta conforme o horário de Brasília", () => {
    expect(getHomeGreeting(new Date("2026-11-24T14:00:00Z"))).toBe("Bom dia");
    expect(getHomeGreeting(new Date("2026-11-24T16:00:00Z"))).toBe(
      "Boa tarde",
    );
    expect(getHomeGreeting(new Date("2026-11-24T23:30:00Z"))).toBe(
      "Boa noite",
    );
  });

  it("formata a data por extenso em pt-BR", () => {
    const label = formatHomeDateLabel(new Date("2026-11-24T14:00:00Z"));

    expect(label).toContain("24 de novembro");
    expect(label.charAt(0)).toBe(label.charAt(0).toUpperCase());
  });
});
