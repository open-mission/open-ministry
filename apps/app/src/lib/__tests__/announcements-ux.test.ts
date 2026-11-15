import { describe, expect, it } from "bun:test";

import { ANNOUNCEMENT_PRESETS } from "@/lib/announcement-presets";
import {
  ANNOUNCEMENT_BODY_MAX_LENGTH,
  ANNOUNCEMENT_CONSOLE_CHANNEL_WARNING,
  ANNOUNCEMENT_DIALOG_CHANNEL_WARNING,
  ANNOUNCEMENT_TITLE_MAX_LENGTH,
  hasAnyAnnouncementChannel,
} from "@/lib/announcements-ux";

const COMPONENTS = {
  dialog: new URL(
    "../../components/notifications/announcement-dialog.tsx",
    import.meta.url,
  ),
  console: new URL(
    "../../components/announcements/announcements-console.tsx",
    import.meta.url,
  ),
  sentList: new URL(
    "../../components/announcements/sent-announcements-list.tsx",
    import.meta.url,
  ),
  bell: new URL("../../components/app/notification-bell.tsx", import.meta.url),
} as const;

async function readComponent(key: keyof typeof COMPONENTS): Promise<string> {
  return Bun.file(COMPONENTS[key]).text();
}

describe("Validação de canais do comunicado", () => {
  it("aceita o envio quando apenas um canal está ativo", () => {
    expect(
      hasAnyAnnouncementChannel({
        sendInApp: true,
        sendWhatsApp: false,
        sendPush: false,
        sendEmail: false,
      }),
    ).toBe(true);
    expect(
      hasAnyAnnouncementChannel({
        sendInApp: false,
        sendWhatsApp: true,
        sendPush: false,
        sendEmail: false,
      }),
    ).toBe(true);
    expect(
      hasAnyAnnouncementChannel({
        sendInApp: false,
        sendWhatsApp: false,
        sendPush: true,
        sendEmail: false,
      }),
    ).toBe(true);
    expect(
      hasAnyAnnouncementChannel({
        sendInApp: false,
        sendWhatsApp: false,
        sendPush: false,
        sendEmail: true,
      }),
    ).toBe(true);
  });

  it("bloqueia o envio quando nenhum canal está ativo", () => {
    expect(
      hasAnyAnnouncementChannel({
        sendInApp: false,
        sendWhatsApp: false,
        sendPush: false,
        sendEmail: false,
      }),
    ).toBe(false);
  });

  it("trata seleção ausente como nenhum canal ativo", () => {
    expect(hasAnyAnnouncementChannel(undefined)).toBe(false);
    expect(hasAnyAnnouncementChannel(null)).toBe(false);
    expect(hasAnyAnnouncementChannel({})).toBe(false);
  });

  it("explica o bloqueio em linguagem acolhedora nas duas telas", () => {
    expect(ANNOUNCEMENT_DIALOG_CHANNEL_WARNING).toBe(
      "Selecione ao menos um canal para enviar o comunicado.",
    );
    expect(ANNOUNCEMENT_CONSOLE_CHANNEL_WARNING).toBe(
      "Selecione ao menos um canal de notificação para disparar o comunicado.",
    );
    expect(ANNOUNCEMENT_DIALOG_CHANNEL_WARNING.toLowerCase()).toContain(
      "canal",
    );
    expect(ANNOUNCEMENT_CONSOLE_CHANNEL_WARNING.toLowerCase()).toContain(
      "canal",
    );
  });
});

describe("Microcopy pastoral das telas de avisos", () => {
  it("não expõe nomes de fornecedores técnicos na interface", async () => {
    for (const key of Object.keys(COMPONENTS) as (keyof typeof COMPONENTS)[]) {
      const source = await readComponent(key);
      expect(source).not.toContain("Brevo");
      expect(source).not.toContain("Evolution API");
      expect(source).not.toContain("React Email");
    }
  });

  it("descreve os canais pelo que o voluntário recebe", async () => {
    const dialog = await readComponent("dialog");
    const consoleSource = await readComponent("console");

    expect(dialog).toContain("Caixa de entrada");
    expect(dialog).toContain("Mensagem formatada entregue no e-mail do voluntário");
    expect(dialog).toContain("Disparo direto no celular do voluntário");

    expect(consoleSource).toContain("Caixa de entrada");
    expect(consoleSource).toContain("Mensagem formatada entregue no e-mail");
    expect(consoleSource).toContain("Disparo direto no WhatsApp");
    expect(consoleSource).toContain('"Conectado" : "Disponível"');
    expect(consoleSource).not.toContain("E-mail (Brevo)");
  });

  it("mantém os modelos pastorais prontos para uso", () => {
    expect(ANNOUNCEMENT_PRESETS).toHaveLength(5);
    expect(ANNOUNCEMENT_PRESETS.map((preset) => preset.label)).toEqual([
      "Comunicado Geral",
      "Escala do Final de Semana",
      "Ensaio e Reunião",
      "Aviso Urgente",
      "Agradecimento",
    ]);

    for (const preset of ANNOUNCEMENT_PRESETS) {
      expect(preset.title.trim().length).toBeGreaterThan(0);
      expect(preset.body.trim().length).toBeGreaterThan(0);
      expect(preset.title.length).toBeLessThanOrEqual(
        ANNOUNCEMENT_TITLE_MAX_LENGTH,
      );
      expect(preset.body.length).toBeLessThanOrEqual(
        ANNOUNCEMENT_BODY_MAX_LENGTH,
      );
      expect(`${preset.label} ${preset.title} ${preset.body}`).not.toContain(
        "Brevo",
      );
      expect(`${preset.label} ${preset.title} ${preset.body}`).not.toContain(
        "Evolution API",
      );
    }
  });
});

describe("Piso tipográfico dos componentes de avisos", () => {
  it("não usa texto menor que 11px", async () => {
    for (const key of Object.keys(COMPONENTS) as (keyof typeof COMPONENTS)[]) {
      const source = await readComponent(key);
      expect(source).not.toContain("text-[10px]");
      expect(source).not.toContain("text-[0.6rem]");
    }
  });

  it("mantém o contador do sino legível e circular", async () => {
    const bell = await readComponent("bell");
    expect(bell).toContain("min-w-4 h-4");
    expect(bell).toContain("text-[11px]");
  });
});

describe("Consistência dos limites de caracteres", () => {
  it("define título em 80 e mensagem em 500 caracteres", () => {
    expect(ANNOUNCEMENT_TITLE_MAX_LENGTH).toBe(80);
    expect(ANNOUNCEMENT_BODY_MAX_LENGTH).toBe(500);
  });

  it("aplica os mesmos limites nos dois formulários", async () => {
    const dialog = await readComponent("dialog");
    const consoleSource = await readComponent("console");

    for (const source of [dialog, consoleSource]) {
      expect(source).toContain("maxLength={ANNOUNCEMENT_TITLE_MAX_LENGTH}");
      expect(source).toContain("maxLength={ANNOUNCEMENT_BODY_MAX_LENGTH}");
    }

    expect(consoleSource).toContain(
      "{title.length}/{ANNOUNCEMENT_TITLE_MAX_LENGTH}",
    );
    expect(consoleSource).toContain(
      "{body.length}/{ANNOUNCEMENT_BODY_MAX_LENGTH}",
    );
  });
});

describe("Diálogos responsivos do módulo de avisos", () => {
  it("usa ResponsiveDialog no formulário de aviso", async () => {
    const dialog = await readComponent("dialog");
    expect(dialog).toContain('from "@/components/app/responsive-dialog"');
    expect(dialog).toContain("<ResponsiveDialog");
    expect(dialog).toContain('title="Enviar aviso"');
    expect(dialog).not.toContain('from "@/components/ui/dialog"');
  });

  it("usa ResponsiveDialog no detalhe do aviso enviado", async () => {
    const sentList = await readComponent("sentList");
    expect(sentList).toContain('from "@/components/app/responsive-dialog"');
    expect(sentList).toContain("<ResponsiveDialog");
    expect(sentList).not.toContain('from "@/components/ui/dialog"');
  });

  it("desabilita o envio sem canal selecionado nas duas telas", async () => {
    const dialog = await readComponent("dialog");
    const consoleSource = await readComponent("console");

    for (const [source, warning] of [
      [dialog, "ANNOUNCEMENT_DIALOG_CHANNEL_WARNING"],
      [consoleSource, "ANNOUNCEMENT_CONSOLE_CHANNEL_WARNING"],
    ] as const) {
      expect(source).toContain("hasAnyAnnouncementChannel(");
      expect(source).toContain("disabled={!hasAnyChannel}");
      expect(source).toContain(warning);
      expect(source).toContain('role="alert"');
      expect(source).toContain("amber-500");
    }
  });
});
