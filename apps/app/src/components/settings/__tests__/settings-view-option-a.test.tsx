import { afterAll, describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("server-only", () => ({}));

mock.module("@/components/settings/notification-preferences-card", () => ({
  NotificationPreferencesCard: () =>
    createElement("div", null, "Notificações"),
}));

afterAll(() => {
  mock.restore();
});

import type { SettingsViewProps } from "@/components/settings/settings-view";

const { SettingsView } = await import(
  "@/components/settings/settings-view"
);

function buildProps(overrides: Partial<SettingsViewProps> = {}): SettingsViewProps {
  return {
    organization: {
      id: "org-1",
      name: "Igreja Esperança Central",
      slug: "igreja-esperanca-central",
      logo: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      metadata: null,
    },
    role: "admin",
    isAdmin: true,
    userData: {
      name: "Maria Clara Silva",
      username: "mariaclara",
      email: "maria@esperanca.org",
      birthday: "1994-05-12",
      phone: "(11) 99812-3400",
      image: null,
    },
    calendarPreferences: {
      weekStartsOn: 0,
      timezone: "America/Sao_Paulo",
    },
    calendarFeeds: [
      {
        id: "feed-1",
        label: "Escalas Pessoais",
        includeServices: true,
        includeRehearsals: true,
        includeDepartmentEvents: false,
        includeAssignments: true,
        lastUsedAt: null,
        createdAt: "2026-11-01T10:00:00.000Z",
      },
    ],
    initialSessions: [
      {
        id: "sess-1",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        createdAt: "2026-11-21T10:00:00.000Z",
        isCurrent: true,
      },
    ],
    initialPasskeys: [
      {
        id: "pk-1",
        name: "MacBook Pro",
        deviceType: "platform",
        backedUp: true,
        createdAt: "2026-10-01T10:00:00.000Z",
      },
      {
        id: "pk-2",
        name: "iPhone",
        deviceType: "platform",
        backedUp: true,
        createdAt: "2026-10-15T10:00:00.000Z",
      },
    ],
    peopleCount: 248,
    departmentsCount: 8,
    evolutionSettings: {
      id: "evo-1",
      apiUrl: "https://evo.example.com",
      apiKey: "masked",
      instanceName: "igreja-esperanca",
      webhookUrl: "https://openministry.online/api/webhooks/evolution",
      isActive: true,
    },
    messageTemplates: [
      {
        type: "assignment",
        title: "Aviso de Escala",
        description: "Enviado antes do culto",
        category: "schedules",
        defaultContent: "Olá {{name}}",
        content: "Olá {{name}}",
        isCustomized: false,
        variables: [
          {
            key: "name",
            label: "Nome",
            example: "Maria Clara",
            description: "Nome do membro",
          },
        ],
      },
    ],
    permissionSettings: null,
    ...overrides,
  };
}

describe("SettingsView — Opção A (Faixa Superior + Minha Conta / Igreja)", () => {
  it("renderiza escopo Minha Conta vs Igreja (Admin), 5 abas horizontais e cards laterais sem dupla sidebar", () => {
    const markup = renderToStaticMarkup(
      createElement(SettingsView, buildProps()),
    );

    expect(markup).toContain("Minha Conta");
    expect(markup).toContain("Igreja (Admin)");
    expect(markup).toContain("Perfil");
    expect(markup).toContain("Aparência &amp; Tema");
    expect(markup).toContain("Notificações");
    expect(markup).toContain("Agenda &amp; Offline");
    expect(markup).toContain("Segurança");
    expect(markup).toContain("1 feed");
    expect(markup).toContain("2 passkeys");

    expect(markup).toContain("Aparência rápida");
    expect(markup).toContain("Acesso &amp; Passkeys");
    expect(markup).toContain("Ir para Igreja (Admin)");

    expect(markup).not.toContain("w-72 shrink-0 border-r");
    expect(markup).not.toContain("bg-blue-500");
    expect(markup).not.toContain("bg-violet-500");
    expect(markup).not.toContain("text-[10px]");
    expect(markup).not.toContain("text-[0.68rem]");
  });

  it("renderiza mobile com alternador de escopo 44px e linhas calmas com status inline", () => {
    const markup = renderToStaticMarkup(
      createElement(SettingsView, buildProps()),
    );

    expect(markup).toContain("min-h-11");
    expect(markup).toContain("min-h-[54px]");
    expect(markup).toContain("Preferências");
    expect(markup).toContain("Segurança &amp; Sistema");
    expect(markup).toContain("2 links".replace("2 links", "1 link ativo"));
    expect(markup).toContain("2 ativas");
    expect(markup).toContain("PWA e cache");
  });

  it("respeita initialScope=church e omite abas administrativas para membros comuns", () => {
    const adminChurchMarkup = renderToStaticMarkup(
      createElement(
        SettingsView,
        buildProps({ initialScope: "church", initialTab: "whatsapp" }),
      ),
    );
    expect(adminChurchMarkup).toContain("Dados da Igreja");
    expect(adminChurchMarkup).toContain("WhatsApp");
    expect(adminChurchMarkup).toContain("Conectado");
    expect(adminChurchMarkup).toContain("Modelos");
    expect(adminChurchMarkup).toContain("Nomenclatura &amp; Permissões");

    const memberMarkup = renderToStaticMarkup(
      createElement(
        SettingsView,
        buildProps({
          role: "member",
          isAdmin: false,
          evolutionSettings: null,
          messageTemplates: [],
          initialScope: "church",
        }),
      ),
    );
    expect(memberMarkup).not.toContain("Igreja (Admin)");
    expect(memberMarkup).not.toContain("WhatsApp (Evolution API)");
    expect(memberMarkup).not.toContain("Módulos &amp; Permissões");
  });

  it("unifica os links do app para abrir /dashboard/settings como página dedicada", async () => {
    const [navUser, drawer, mobileMenu, modalProvider] = await Promise.all([
      Bun.file(
        new URL("../../app/nav-user.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL("../../app/user-menu-drawer.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL("../../app/mobile-menu.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL("../settings-modal-provider.tsx", import.meta.url),
      ).text(),
    ]);

    expect(navUser).toContain('href="/dashboard/settings"');
    expect(drawer).toContain('href="/dashboard/settings"');
    expect(mobileMenu).toContain('href="/dashboard/settings"');
    expect(modalProvider).toContain('router.push("/dashboard/settings")');
    expect(modalProvider).not.toContain("Configurações do Sistema");
  });
});
