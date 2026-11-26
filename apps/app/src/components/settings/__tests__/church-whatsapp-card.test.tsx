import { afterAll, describe, expect, it, mock } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("server-only", () => ({}));
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/settings",
}));
mock.module("@/components/settings/evolution-message-logs", () => ({
  EvolutionMessageLogsCard: () =>
    createElement("div", { "data-testid": "evolution-logs-stub" }, "Histórico WhatsApp"),
}));
mock.module("@/hooks/use-device-sessions", () => ({
  useDeviceSessions: () => ({ sessions: [] }),
}));

afterAll(() => {
  mock.restore();
});

const { AdminEvolutionApiCard, normalizeQrCodeSrc } = await import(
  "@/components/settings/admin-evolution-api-card"
);
const { UserMenuDrawer } = await import("@/components/app/user-menu-drawer");

describe("AdminEvolutionApiCard — WhatsApp gerenciado pela plataforma", () => {
  it("renderiza Estado A (blocked) com motivo do plano e sem expor credenciais técnicas", () => {
    const html = renderToStaticMarkup(
      createElement(AdminEvolutionApiCard, {
        initialView: {
          state: "blocked",
          organizationId: "org-1",
          planName: "Gratuito",
          reason: "Este recurso ainda não está liberado no plano da sua igreja.",
        },
      }),
    );

    expect(html).toContain("Plano Gratuito");
    expect(html).toContain(
      "Este recurso ainda não está liberado no plano da sua igreja.",
    );
    expect(html).not.toContain("apiUrl");
    expect(html).not.toContain("globalApiKey");
    expect(html).not.toContain("webhookUrl");
  });

  it("renderiza Estado B (ready) com os 3 passos e CTA de criação da conexão", () => {
    const html = renderToStaticMarkup(
      createElement(AdminEvolutionApiCard, {
        initialView: {
          state: "ready",
          organizationId: "org-1",
          steps: [
            "Crie a conexão do WhatsApp para sua igreja.",
            "Escaneie o QR Code com o celular.",
            "Pronto: escalas e avisos chegam automaticamente.",
          ],
        },
      }),
    );

    expect(html).toContain("Pronto para conectar");
    expect(html).toContain("Ative o WhatsApp da sua igreja");
    expect(html).toContain("Criar conexão com WhatsApp");
    expect(html).not.toContain("apiUrl");
    expect(html).not.toContain("apiKey");
    expect(html).not.toContain("webhookUrl");
  });

  it("renderiza Estado C (pairing) com erro de reconexão quando presente, ações e histórico", () => {
    const html = renderToStaticMarkup(
      createElement(AdminEvolutionApiCard, {
        initialView: {
          state: "pairing",
          organizationId: "org-1",
          instanceName: "om-igreja-pcm",
          connectionStatus: "disconnected",
          connectedPhone: null,
          connectedProfileName: null,
          lastError: "Sessão desconectada no aparelho",
          isActive: true,
        },
      }),
    );

    expect(html).toContain("om-igreja-pcm");
    expect(html).toContain("Sessão desconectada no aparelho");
    expect(html).toContain("Gerar QR Code");
    expect(html).toContain("Verificar conexão");
    expect(html).toContain("Desconectar");
    expect(html).toContain("Histórico WhatsApp");
    expect(html).not.toContain("apiUrl");
    expect(html).not.toContain("globalApiKey");
    expect(html).not.toContain("webhookUrl");
  });

  it("renderiza Estado D (connected) com perfil, envio de teste e aviso quando pausado", () => {
    const connectedHtml = renderToStaticMarkup(
      createElement(AdminEvolutionApiCard, {
        initialView: {
          state: "connected",
          organizationId: "org-1",
          instanceName: "om-igreja-pcm",
          connectionStatus: "connected",
          connectedPhone: "+55 11 99999-8888",
          connectedProfileName: "Secretaria PCM",
          lastError: null,
          isActive: true,
        },
      }),
    );

    expect(connectedHtml).toContain("Conectado");
    expect(connectedHtml).toContain("Secretaria PCM");
    expect(connectedHtml).toContain("+55 11 99999-8888");
    expect(connectedHtml).toContain("Enviar mensagem de teste");
    expect(connectedHtml).toContain("Enviar teste agora");
    expect(connectedHtml).toContain("Histórico WhatsApp");

    const pausedHtml = renderToStaticMarkup(
      createElement(AdminEvolutionApiCard, {
        initialView: {
          state: "connected",
          organizationId: "org-1",
          instanceName: "om-igreja-pcm",
          connectionStatus: "connected",
          connectedPhone: "+55 11 99999-8888",
          connectedProfileName: "Secretaria PCM",
          lastError: null,
          isActive: false,
        },
      }),
    );

    expect(pausedHtml).toContain("Pausado");
    expect(pausedHtml).toContain("envios automáticos estão pausados");
  });

  it("garante que o código-fonte do cartão da igreja nunca contenha campos apiUrl, apiKey ou webhookUrl", async () => {
    const source = await Bun.file(
      new URL("../admin-evolution-api-card.tsx", import.meta.url),
    ).text();

    expect(source).not.toContain("apiUrl");
    expect(source).not.toContain("apiKey");
    expect(source).not.toContain("globalApiKey");
    expect(source).not.toContain("webhookUrl");
  });

  it("aceita apenas data:image/(png|jpeg|webp);base64 ou base64 puro válido em normalizeQrCodeSrc", () => {
    expect(normalizeQrCodeSrc("QRBASE64")).toBe("data:image/png;base64,QRBASE64");
    expect(
      normalizeQrCodeSrc("  data:image/PNG;base64,iVBORw0KGgo=  "),
    ).toBe("data:image/png;base64,iVBORw0KGgo=");
    expect(normalizeQrCodeSrc("data:image/jpeg;base64,/9j/4AAQ")).toBe(
      "data:image/jpeg;base64,/9j/4AAQ",
    );
    expect(normalizeQrCodeSrc("data:image/webp;base64,UklGRh4=")).toBe(
      "data:image/webp;base64,UklGRh4=",
    );

    expect(normalizeQrCodeSrc("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(normalizeQrCodeSrc("data:image/svg+xml;utf8,<svg></svg>")).toBeNull();
    expect(normalizeQrCodeSrc("<svg onload=alert(1)></svg>")).toBeNull();
    expect(normalizeQrCodeSrc("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(normalizeQrCodeSrc("data:image/gif;base64,R0lGODlh")).toBeNull();
    expect(normalizeQrCodeSrc("http://evil.test/qr.png")).toBeNull();
    expect(normalizeQrCodeSrc("https://evil.test/qr.png")).toBeNull();
    expect(normalizeQrCodeSrc("data:image/png;base64,not valid!")).toBeNull();
    expect(normalizeQrCodeSrc("   ")).toBeNull();
    expect(normalizeQrCodeSrc(null)).toBeNull();
  });

  it("renderiza <img> apenas para QR Code válido e exibe aviso limpo quando o QR Code é rejeitado", () => {
    const basePairing = {
      state: "pairing" as const,
      organizationId: "org-1",
      instanceName: "om-igreja-pcm",
      connectionStatus: "disconnected",
      connectedPhone: null,
      connectedProfileName: null,
      lastError: null,
      isActive: true,
    };

    const validHtml = renderToStaticMarkup(
      createElement(AdminEvolutionApiCard, {
        initialView: basePairing,
        initialQrCode: "QRBASE64",
      }),
    );
    expect(validHtml).toContain('src="data:image/png;base64,QRBASE64"');
    expect(validHtml).toContain("Recriar QR Code");

    for (const maliciousQr of [
      "data:image/svg+xml;utf8,<svg onload=alert(1)></svg>",
      "<svg onload=alert(1)></svg>",
      "https://evil.test/qr.png",
      "data:text/html;base64,PHNjcmlwdD4=",
    ]) {
      const rejectedHtml = renderToStaticMarkup(
        createElement(AdminEvolutionApiCard, {
          initialView: basePairing,
          initialQrCode: maliciousQr,
        }),
      );
      expect(rejectedHtml).not.toContain("<img");
      expect(rejectedHtml).toContain("QR Code inválido ou em formato não suportado");
      expect(rejectedHtml).toContain("Gerar QR Code");
    }
  });
});

describe("UserMenuDrawer — entrada discreta para Super Admin", () => {
  const baseUser = {
    name: "Claudio",
    email: "claudio@igreja.org",
    image: null,
  };

  it("oculta o link Painel da Plataforma para usuários comuns", () => {
    const html = renderToStaticMarkup(
      createElement(UserMenuDrawer, {
        user: baseUser,
        role: "admin",
        organizationName: "Igreja PCM",
        isSuperAdmin: false,
      }),
    );

    expect(html).not.toContain("Painel da Plataforma");
    expect(html).not.toContain('href="/platform"');
  });

  it("exibe o link Painel da Plataforma (/platform) apenas quando isSuperAdmin é true", () => {
    const html = renderToStaticMarkup(
      createElement(UserMenuDrawer, {
        user: baseUser,
        role: "admin",
        organizationName: "Igreja PCM",
        isSuperAdmin: true,
      }),
    );

    expect(html).toContain("Painel da Plataforma");
    expect(html).toContain('href="/platform"');
  });
});
