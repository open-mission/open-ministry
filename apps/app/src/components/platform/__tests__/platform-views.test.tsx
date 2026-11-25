import { afterAll, describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("server-only", () => ({}));
mock.module("next/navigation", () => ({
  usePathname: () => "/platform",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

afterAll(() => {
  mock.restore();
});

const { PlatformAccessError } = await import("@/lib/platform/auth");
const { resolvePlatformGuardRedirect } = await import(
  "@/components/platform/platform-guard"
);
const { PlatformShell } = await import(
  "@/components/platform/platform-shell"
);
const { PlatformOrganizationsView } = await import(
  "@/components/platform/platform-organizations-view"
);
const { PlatformIntegrationsView } = await import(
  "@/components/platform/platform-integrations-view"
);
const { PlatformPlansView } = await import(
  "@/components/platform/platform-plans-view"
);
const { PlatformOperatorsView } = await import(
  "@/components/platform/platform-operators-view"
);

describe("PlatformGuard — redirecionamento por sessão e papel", () => {
  it("redireciona usuário sem sessão para /login e usuário sem super_admin ou em impersonação para /", () => {
    expect(resolvePlatformGuardRedirect(false, new PlatformAccessError())).toBe(
      "/login",
    );
    expect(resolvePlatformGuardRedirect(true, new PlatformAccessError())).toBe(
      "/",
    );
    expect(resolvePlatformGuardRedirect(true, null)).toBeNull();
  });
});

describe("Painel /platform — Shell e páginas operacionais", () => {
  it("renderiza PlatformShell isolado com navegação, chip Sem igreja ativa e retorno ao app", () => {
    const html = renderToStaticMarkup(
      createElement(
        PlatformShell,
        {
          operator: { name: "Dono", email: "dono@openministry.app" },
          evolutionHealth: {
            isEnabled: true,
            lastHealthStatus: "healthy",
            lastHealthLatencyMs: 42,
          },
        },
        createElement("div", null, "Conteúdo Plataforma"),
      ),
    );

    expect(html).toContain("Super Admin");
    expect(html).toContain("Sem igreja ativa");
    expect(html).toContain("Evolution Go · Online (42ms)");
    expect(html).toContain("Voltar ao app da igreja");
    expect(html).toContain('href="/platform"');
    expect(html).toContain('href="/platform/integrations"');
    expect(html).toContain('href="/platform/plans"');
    expect(html).toContain('href="/platform/operators"');
    expect(html).toContain("Conteúdo Plataforma");
  });

  it("renderiza /platform com KPIs, filtros e lista de igrejas", () => {
    const html = renderToStaticMarkup(
      createElement(PlatformOrganizationsView, {
        initialOverview: {
          organizations: { total: 3, active: 2, trial: 1, suspended: 0 },
          whatsapp: { enabled: 1, connected: 1 },
          providers: [
            {
              provider: "evolution_whatsapp",
              displayName: "Evolution API Go (Evogo)",
              isEnabled: true,
              source: "env",
              lastHealthStatus: "healthy",
              lastHealthLatencyMs: 38,
            },
          ],
        },
        initialOrganizations: [
          {
            id: "org-1",
            name: "Igreja PCM",
            slug: "igreja-pcm",
            logo: null,
            status: "active",
            plan: { id: "plan_pro", slug: "pro", name: "Pro" },
            whatsapp: {
              enabled: true,
              connectionStatus: "connected",
              connectedPhone: "+55 11 99999-8888",
              hasInstance: true,
            },
            membersCount: 140,
            createdAt: new Date("2026-01-10T12:00:00Z"),
          },
        ],
        initialTotal: 1,
        plans: [
          {
            id: "plan_pro",
            slug: "pro",
            name: "Pro",
            description: "Plano completo",
            features: {
              whatsapp_notifications: true,
              whatsapp_max_instances: 1,
            },
            isActive: true,
            isDefault: false,
            sortOrder: 1,
          },
        ],
      }),
    );

    expect(html).toContain("Organizações da Plataforma");
    expect(html).toContain("Igrejas ativas");
    expect(html).toContain("Igreja PCM");
    expect(html).toContain("igreja-pcm");
    expect(html).toContain("Conectado");
    expect(html).toContain("Gerenciar");
  });

  it("renderiza /platform/integrations com segredo mascarado e cards futuros", () => {
    const html = renderToStaticMarkup(
      createElement(PlatformIntegrationsView, {
        initialIntegrations: [
          {
            provider: "evolution_whatsapp",
            displayName: "Evolution API Go (Evogo)",
            isEnabled: true,
            source: "platform",
            hasEnvFallback: true,
            config: { apiUrl: "https://evo.openministry.app" },
            hasSecret: true,
            maskedSecret: "••••89ab",
            secretMasks: { globalApiKey: "••••89ab" },
            lastHealthStatus: "healthy",
            lastHealthLatencyMs: 31,
            lastHealthCheckedAt: new Date("2026-11-24T12:00:00Z"),
            lastHealthError: null,
          },
        ],
      }),
    );

    expect(html).toContain("Evolution API Go (Evogo)");
    expect(html).toContain("Salva: ••••89ab");
    expect(html).toContain("https://evo.openministry.app");
    expect(html).toContain("WhatsApp Oficial (Meta Cloud API)");
    expect(html).toContain("Em breve");
  });

  it("renderiza /platform/plans e /platform/operators respeitando trava de bootstrap", () => {
    const plansHtml = renderToStaticMarkup(
      createElement(PlatformPlansView, {
        initialPlans: [
          {
            id: "plan_free",
            slug: "free",
            name: "Gratuito",
            description: "Plano inicial",
            features: {
              whatsapp_notifications: false,
              whatsapp_max_instances: 0,
            },
            isActive: true,
            isDefault: true,
            sortOrder: 0,
          },
        ],
      }),
    );

    expect(plansHtml).toContain("Gratuito");
    expect(plansHtml).toContain("Padrão");
    expect(plansHtml).toContain("Bloqueado");

    const operatorsHtml = renderToStaticMarkup(
      createElement(PlatformOperatorsView, {
        initialOperators: [
          {
            id: "user-1",
            name: "Dono",
            email: "dono@openministry.app",
            role: "super_admin",
            isBootstrap: true,
            createdAt: new Date("2026-01-01T00:00:00Z"),
          },
        ],
        initialAuditEntries: [
          {
            id: "aud-1",
            actorUserId: "user-1",
            actorEmail: "dono@openministry.app",
            action: "integration.evolution_saved",
            targetType: "platform_integration_config",
            targetId: "evo-1",
            summary: "Configuração global da Evolution Go atualizada.",
            metadataJson: {},
            createdAt: new Date("2026-11-24T12:00:00Z"),
          },
        ],
        initialAuditTotal: 1,
        currentOperatorEmail: "dono@openministry.app",
      }),
    );

    expect(operatorsHtml).toContain("Bootstrap (.env)");
    expect(operatorsHtml).toContain("Protegido pelo bootstrap (.env)");
    expect(operatorsHtml).toContain("integration.evolution_saved");
  });
});
