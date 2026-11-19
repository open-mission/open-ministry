import { beforeEach, describe, expect, it, mock } from "bun:test";

const BASE_URL = "https://app.openministry.test";

const state = {
  organizationFindFirstCalls: [] as Array<Record<string, unknown>>,
  organization: {
    name: "Igreja PCM",
    logo: "/brand/church-logo.png",
  } as { name: string; logo: string | null } | null,
  organizationThrows: false,
  insertCalls: [] as Array<Record<string, unknown>>,
  brevoCalls: [] as Array<Record<string, unknown>>,
  renderCalls: [] as Array<{
    key: string;
    props: Record<string, unknown>;
    options?: { useSampleData?: boolean };
  }>,
  reset() {
    this.organizationFindFirstCalls = [];
    this.organization = { name: "Igreja PCM", logo: "/brand/church-logo.png" };
    this.organizationThrows = false;
    this.insertCalls = [];
    this.brevoCalls = [];
    this.renderCalls = [];
  },
};

mock.module("@/lib/app-url", () => ({
  getAppBaseUrl: () => BASE_URL,
}));

mock.module("@/db", () => ({
  db: {
    query: {
      organization: {
        findFirst: async (args: Record<string, unknown>) => {
          state.organizationFindFirstCalls.push(args);
          if (state.organizationThrows) {
            throw new Error("db indisponível");
          }
          return state.organization;
        },
      },
    },
    insert: () => ({
      values: async (values: Record<string, unknown>) => {
        state.insertCalls.push(values);
      },
    }),
  },
}));

mock.module("@/lib/email/brevo", () => ({
  sendEmailViaBrevo: async (params: Record<string, unknown>) => {
    state.brevoCalls.push(params);
    return { ok: true, messageId: "brevo-test" };
  },
}));

// Guarda a implementação real antes de registrar o mock: o teste registra os
// props utilizados e delega a renderização para o template original.
const actualTemplates = await import("@/lib/email/templates");
const realRenderTemplateHtml = actualTemplates.renderTemplateHtml;

mock.module("@/lib/email/templates", () => ({
  ...actualTemplates,
  renderTemplateHtml: async (
    key: Parameters<typeof realRenderTemplateHtml>[0],
    props: Record<string, unknown>,
    options?: Parameters<typeof realRenderTemplateHtml>[2],
  ) => {
    state.renderCalls.push({ key, props, options });
    return realRenderTemplateHtml(key, props, options);
  },
}));

const {
  buildAppEmailBrandAssets,
  normalizeEmailAssetUrl,
  sendTransactionalEmail,
} = await import("@/lib/email/service");

describe("normalizeEmailAssetUrl", () => {
  it("mantém URLs absolutas https", () => {
    expect(
      normalizeEmailAssetUrl("https://utfs.io/f/logo-igreja.png", BASE_URL),
    ).toBe("https://utfs.io/f/logo-igreja.png");
  });

  it("resolve caminhos relativos contra a base do app", () => {
    expect(normalizeEmailAssetUrl("/brand/x.png", BASE_URL)).toBe(
      `${BASE_URL}/brand/x.png`,
    );
  });

  it("rejeita protocolos não seguros e strings vazias", () => {
    expect(normalizeEmailAssetUrl("javascript:alert(1)", BASE_URL)).toBeNull();
    expect(normalizeEmailAssetUrl("data:text/html,<p>x</p>", BASE_URL)).toBeNull();
    expect(normalizeEmailAssetUrl("", BASE_URL)).toBeNull();
    expect(normalizeEmailAssetUrl("   ", BASE_URL)).toBeNull();
    expect(normalizeEmailAssetUrl(null, BASE_URL)).toBeNull();
  });

  it("rejeita caminho relativo sem barra inicial", () => {
    expect(normalizeEmailAssetUrl("brand/x.png", BASE_URL)).toBeNull();
  });
});

describe("buildAppEmailBrandAssets", () => {
  it("aponta para os assets PNG da marca", () => {
    expect(buildAppEmailBrandAssets(BASE_URL)).toEqual({
      appLogoUrl: `${BASE_URL}/brand/openministry-app-icon-dark.png`,
      appWordmarkUrl: `${BASE_URL}/brand/openministry-logo-full-black.png`,
    });
  });

  it("remove barras finais duplicadas", () => {
    expect(buildAppEmailBrandAssets(`${BASE_URL}/`).appLogoUrl).toBe(
      `${BASE_URL}/brand/openministry-app-icon-dark.png`,
    );
  });
});

describe("listEmailTemplateCatalog", () => {
  const catalog = actualTemplates.listEmailTemplateCatalog();

  it("lista os 7 modelos, incluindo o lembrete de ensaio", () => {
    expect(catalog).toHaveLength(7);

    const keys = catalog.map((item) => item.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "welcome",
        "reset_password",
        "magic_link",
        "email_verification",
        "assignment",
        "announcement",
        "rehearsal_reminder",
      ]),
    );
  });

  it("descreve o lembrete de ensaio com metadados completos", () => {
    const rehearsal = catalog.find(
      (item) => item.key === "rehearsal_reminder",
    );

    expect(rehearsal).toBeDefined();
    expect(rehearsal!.name).toBeTruthy();
    expect(rehearsal!.category).toBe("escala");
    expect(rehearsal!.description).toBeTruthy();
    expect(rehearsal!.defaultSubject).toBeTruthy();
  });

  it("expõe apenas campos serializáveis, sem componente nem sampleData", () => {
    for (const item of catalog) {
      expect(Object.keys(item).sort()).toEqual([
        "category",
        "defaultSubject",
        "description",
        "key",
        "name",
      ]);
      expect("renderComponent" in item).toBe(false);
      expect("sampleData" in item).toBe(false);
    }
  });
});

describe("renderTemplateHtml sem dados de exemplo", () => {
  it("não vaza o autor fictício do modelo de aviso", async () => {
    const { html } = await realRenderTemplateHtml(
      "announcement",
      { churchName: "Igreja PCM", title: "Aviso", body: "Texto" },
      { useSampleData: false },
    );

    expect(html).not.toContain("Pr. Marcos Silva");
    expect(html).toContain("Aviso");
  });

  it("não vaza músicas nem notas fictícias do lembrete de ensaio", async () => {
    const { html } = await realRenderTemplateHtml(
      "rehearsal_reminder",
      { churchName: "Igreja PCM", eventTitle: "Ensaio", songs: [] },
      { useSampleData: false },
    );

    expect(html).not.toContain("Grande é o Senhor");
    expect(html).not.toContain("Chegar 15 minutos");
    expect(html).toContain("Ensaio");
  });
});

describe("sendTransactionalEmail", () => {
  beforeEach(() => {
    state.reset();
  });

  it("hidrata a organização, normaliza a logo e envia assets PNG sem sampleData", async () => {
    const result = await sendTransactionalEmail({
      type: "announcement",
      to: { email: "membro@igreja.test", name: "Ana" },
      organizationId: "org-1",
      data: { title: "Aviso", body: "Reunião de líderes." },
    });

    expect(result.ok).toBe(true);
    expect(state.organizationFindFirstCalls).toHaveLength(1);

    const render = state.renderCalls.at(-1);
    expect(render).toBeDefined();
    expect(render!.options).toEqual({ useSampleData: false });
    expect(render!.props.churchName).toBe("Igreja PCM");
    expect(render!.props.churchLogo).toBe(
      `${BASE_URL}/brand/church-logo.png`,
    );
    expect(render!.props.appLogoUrl).toBe(
      `${BASE_URL}/brand/openministry-app-icon-dark.png`,
    );
    expect(render!.props.appWordmarkUrl).toBe(
      `${BASE_URL}/brand/openministry-logo-full-black.png`,
    );

    const brevoCall = state.brevoCalls.at(-1);
    const html = String(brevoCall?.htmlContent ?? "");
    expect(html).toContain(`${BASE_URL}/brand/church-logo.png`);
    expect(html).toContain("Reunião de líderes.");
    expect(html).not.toContain("Pr. Marcos Silva");
    expect(html).not.toContain("Ensaio Geral e Alinhamento de Equipes");
  });

  it("não consulta a organização quando o chamador já informa nome e logo", async () => {
    await sendTransactionalEmail({
      type: "announcement",
      to: { email: "membro@igreja.test", name: "Ana" },
      organizationId: "org-1",
      data: {
        churchName: "Igreja Local",
        churchLogo: "https://utfs.io/f/logo-igreja.png",
        title: "Aviso",
        body: "Texto",
      },
    });

    expect(state.organizationFindFirstCalls).toHaveLength(0);
    const render = state.renderCalls.at(-1);
    expect(render!.props.churchName).toBe("Igreja Local");
    expect(render!.props.churchLogo).toBe("https://utfs.io/f/logo-igreja.png");
  });

  it("não quebra o envio quando a consulta da organização falha", async () => {
    state.organizationThrows = true;
    const consoleError = mock(() => {});
    const originalConsoleError = console.error;
    console.error = consoleError;

    try {
      const result = await sendTransactionalEmail({
        type: "announcement",
        to: { email: "membro@igreja.test", name: "Ana" },
        organizationId: "org-1",
        data: {
          churchName: "Igreja PCM",
          title: "Aviso",
          body: "Texto",
        },
      });

      expect(state.organizationFindFirstCalls).toHaveLength(1);
      expect(result.ok).toBe(true);
    } finally {
      console.error = originalConsoleError;
    }
  });
});
