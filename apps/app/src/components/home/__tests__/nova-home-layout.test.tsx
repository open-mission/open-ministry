import { afterAll, describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ChurchInfoCard } from "@/components/home/church-info-card";
import { DepartmentsCard } from "@/components/home/departments-card";
import { HomeGrid } from "@/components/home/home-grid";
import { HomeHeaderTabs } from "@/components/home/home-header-tabs";
import { HomeTabProvider } from "@/components/home/home-tab-context";
import { HomeSkeleton } from "@/components/home/home-skeleton";
import { HomeTabs } from "@/components/home/home-tabs";
import { NextAssignmentCard } from "@/components/home/next-assignment-card";
import { NextServiceCard } from "@/components/home/next-service-card";
import { NotificationsCard } from "@/components/home/notifications-card";
import { TasksCard } from "@/components/home/tasks-card";
import { TodayHomeLayout } from "@/components/home/today-home-layout";
import { UpcomingEventsCard } from "@/components/home/upcoming-events-card";
import { VerseCard } from "@/components/home/verse-card";
import { WeekAttentionCard } from "@/components/home/week-attention-card";
import type { MyAvailabilityResult } from "@/lib/availability";
import type { DepartmentCoverage } from "@/lib/events";

// O caminho é controlado pelo roteador do Next; o mock permite renderizar o
// header integrado na home e em rotas comuns sem montar um App Router.
const actualNavigation = await import("next/navigation");

let currentPathname = "/";

mock.module("next/navigation", () => ({
  ...actualNavigation,
  usePathname: () => currentPathname,
}));

const {
  HomeAwareHeader,
  HomeAwareHeaderFallback,
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

  it("HomeSkeleton e HomeGrid não duplicam header/abas e mantêm o grid de 12 colunas", () => {
    const skeleton = renderToStaticMarkup(createElement(HomeSkeleton));
    expect(skeleton).toContain("max-w-6xl");
    expect(skeleton).toContain("gap-8");
    expect(skeleton).not.toContain("h-10 w-56");
    expect(skeleton).not.toContain("h-4 w-80");
    expect(skeleton).not.toContain("gap-7");
    expect(skeleton).toContain("lg:grid-cols-12");
    expect(skeleton).toContain("lg:col-span-7");
    expect(skeleton).toContain("lg:col-span-5");

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

  it("mantém mt-2 e borda transparente na home antes de rolar", () => {
    const className = getHeaderClassName(true, false);

    expect(className).toContain("sticky");
    expect(className).toContain("top-0");
    expect(className).toContain("z-20");
    expect(className).toContain("border-b");
    expect(className).toContain("mt-2");
    expect(className).toContain("transition-colors");
    expect(className).toContain("duration-200");
    expect(className).toContain("border-transparent");
    expect(className).not.toContain("border-border");
  });

  it("troca a borda da home para border-border ao rolar, sem perder mt-2", () => {
    const className = getHeaderClassName(true, true);

    expect(className).toContain("mt-2");
    expect(className).toContain("border-b");
    expect(className).toContain("transition-colors");
    expect(className).toContain("border-border");
    expect(className).not.toContain("border-transparent");
  });

  it("preserva o header original sem mt-2 nas demais rotas", () => {
    const className = getHeaderClassName(false, true);

    expect(className).toContain("border-b");
    expect(className).toContain("border-border");
    expect(className).not.toContain("mt-2");
    expect(className).not.toContain("border-transparent");
    expect(className).not.toContain("transition-colors");
  });

  it("HomeAwareHeader renderiza o header da home com margem e borda transparente", () => {
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
    expect(markup).toContain("border-transparent");
    expect(markup).toContain("sticky");
    expect(markup).toContain("CONTEUDO_HEADER");
  });

  it("HomeAwareHeader mantém borda visível e sem margem extra fora da home", () => {
    currentPathname = "/dashboard";

    const markup = renderToStaticMarkup(
      createElement(
        HomeAwareHeader,
        null,
        createElement("span", null, "CONTEUDO_HEADER"),
      ),
    );

    expect(markup).toContain("<header");
    expect(markup).toContain("border-border");
    expect(markup).not.toContain("mt-2");
    expect(markup).not.toContain("border-transparent");
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
    expect(onHome).toContain("border-border");
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
    expect(markup).toContain("hover:bg-muted/50");
    expect(markup).toContain("focus-visible:ring-2");
    expect(markup).toContain("Preparar a escala");
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

const unsavedAvailability: MyAvailabilityResult = {
  personId: "person-1",
  days: [],
  notes: null,
  hasSaved: false,
  updatedAt: null,
};

describe("Versículo compacto da home mobile", () => {
  it("mantém título, referência, Copiar e Abrir na Bíblia em um bloco baixo", () => {
    const markup = renderToStaticMarkup(
      createElement(VerseCard, { verse, variant: "compact" }),
    );

    expect(markup).toContain("Versículo do Dia");
    expect(markup).toContain("— João 3:16");
    expect(markup).toContain("font-serif");
    expect(markup).toContain("line-clamp-2");
    expect(markup).toContain("Copiar");
    expect(markup).toContain("Abrir na Bíblia");
    expect(markup).toContain("bg-transparent");
    expect(markup).toContain("min-h-[32px]");
    expect(markup).toContain("text-[11px]");
    expect(markup).not.toContain("Compartilhar");
    expect(markup).not.toContain("Ver imagem");
    expect(markup).not.toContain("blur-3xl");
  });

  it("mantém o card completo como padrão", () => {
    const markup = renderToStaticMarkup(createElement(VerseCard, { verse }));

    expect(markup).toContain("blur-3xl");
    expect(markup).toContain("Compartilhar");
    expect(markup).toContain("Abrir na Bíblia");
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

  it("aparece para a liderança com até 3 pendências e lembrete de disponibilidade", () => {
    const markup = renderToStaticMarkup(
      createElement(WeekAttentionCard, {
        departments: coverageWithGap,
        canManage: true,
        availability: unsavedAvailability,
      }),
    );

    expect(markup).toContain("Atenção da semana");
    expect(markup).toContain("Louvor");
    expect(markup).toContain("Culto de domingo");
    expect(markup).toContain("Teclado, Bateria");
    expect(markup).toContain('href="/dashboard/events/event-1"');
    expect(markup).toContain('href="/dashboard/availability"');
    expect(markup).toContain("disponibilidade");
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
});
