import { describe, expect, it } from "bun:test";

import { buildWhatsAppShareUrl } from "@/lib/message-templates";
import {
  formatBrazilianPhone,
  isValidBrazilianPhone,
} from "@/lib/whatsapp-prompt";

const COMPONENTS = {
  messageLogs: new URL(
    "../../components/whatsapp/whatsapp-message-logs.tsx",
    import.meta.url,
  ),
  templates: new URL(
    "../../components/settings/message-templates-card.tsx",
    import.meta.url,
  ),
  evolution: new URL(
    "../../components/settings/admin-evolution-api-card.tsx",
    import.meta.url,
  ),
  invitation: new URL(
    "../../components/members/whatsapp-invitation-dialog.tsx",
    import.meta.url,
  ),
  peopleInvitation: new URL(
    "../../features/people/components/whatsapp-invitation-dialog.tsx",
    import.meta.url,
  ),
  phonePrompt: new URL(
    "../../components/app/whatsapp-phone-prompt.tsx",
    import.meta.url,
  ),
} as const;

type ComponentKey = keyof typeof COMPONENTS;

async function readComponent(key: ComponentKey): Promise<string> {
  return Bun.file(COMPONENTS[key]).text();
}

const PHONE_INPUT_FLOWS: ComponentKey[] = [
  "templates",
  "evolution",
  "invitation",
];

describe("Máscara dinâmica de telefone brasileiro", () => {
  it("formata celular e fixo enquanto o usuário digita", () => {
    expect(formatBrazilianPhone("11988887777")).toBe("(11) 98888-7777");
    expect(formatBrazilianPhone("1133334444")).toBe("(11) 3333-4444");
    expect(formatBrazilianPhone("1198888")).toBe("(11) 98888");
    expect(formatBrazilianPhone("+55 (11) 98888-7777")).toBe(
      "(11) 98888-7777",
    );
  });

  it("mantém a validação alinhada ao formato exibido", () => {
    expect(isValidBrazilianPhone(formatBrazilianPhone("11988887777"))).toBe(
      true,
    );
    expect(isValidBrazilianPhone(formatBrazilianPhone("1133334444"))).toBe(
      true,
    );
    expect(isValidBrazilianPhone(formatBrazilianPhone("1198888"))).toBe(false);
  });

  it("aplica a máscara nos campos de teste e de convite", async () => {
    for (const key of PHONE_INPUT_FLOWS) {
      const source = await readComponent(key);
      expect(source).toContain('formatBrazilianPhone');
      expect(source).toContain('from "@/lib/whatsapp-prompt"');
      expect(source).toContain("formatBrazilianPhone(e.target.value)");
      expect(source).toContain('inputMode="tel"');
    }
  });

  it("orienta o formato mascarado no convite do WhatsApp", async () => {
    const invitation = await readComponent("invitation");
    expect(invitation).toContain('placeholder="Ex: (11) 98888-7777"');
  });

  it("gera a URL do WhatsApp a partir do número mascarado", () => {
    const masked = formatBrazilianPhone("11988887777");

    expect(buildWhatsAppShareUrl({ phone: masked, text: "Olá" })).toBe(
      `https://wa.me/5511988887777?text=${encodeURIComponent("Olá")}`,
    );
  });

  it("mascara também o telefone pré-carregado do convite", async () => {
    const invitation = await readComponent("invitation");
    expect(invitation).toContain("setPhone(formatBrazilianPhone(res.phone))");
  });
});

describe("Piso tipográfico dos componentes do WhatsApp", () => {
  it("não usa texto menor que 11px nos componentes tocados", async () => {
    for (const key of Object.keys(COMPONENTS) as ComponentKey[]) {
      const source = await readComponent(key);
      expect(source).not.toContain("text-[10px]");
      expect(source).not.toContain("text-[0.7rem]");
    }
  });

  it("eleva os microtextos do histórico para 11px", async () => {
    const messageLogs = await readComponent("messageLogs");
    expect(messageLogs).toContain("text-[11px]");
    expect(messageLogs).not.toContain("text-[10px]");
  });
});

describe("Microcopy e semântica do histórico de mensagens", () => {
  it("explica o identificador e a atualização automática sem jargão", async () => {
    const messageLogs = await readComponent("messageLogs");
    expect(messageLogs).toContain("Identificador da mensagem:");
    expect(messageLogs).toContain(
      "Atualizado automaticamente pelo sistema de confirmações de leitura",
    );
    expect(messageLogs).not.toContain("ID Evolution WhatsApp:");
    expect(messageLogs).not.toContain(
      "Atualizado automaticamente pelo Webhook Evolution",
    );
  });

  it("preserva os estados e ações do histórico", async () => {
    const messageLogs = await readComponent("messageLogs");
    expect(messageLogs).toContain("Entregue");
    expect(messageLogs).toContain("Lido");
    expect(messageLogs).toContain("Pendente na fila");
    expect(messageLogs).toContain("Reenviar");
  });
});

describe("Convite via WhatsApp preserva suas ações", () => {
  it("mantém as abas, a cópia e o link de abertura", async () => {
    const invitation = await readComponent("invitation");
    expect(invitation).toContain('aria-label="Enviar convite por WhatsApp"');
    expect(invitation).toContain("Mensagem de Convite");
    expect(invitation).toContain("Salvar Contato");
    expect(invitation).toContain("Copiar Mensagem");
    expect(invitation).toContain("Abrir no WhatsApp");
  });
});

describe("Diálogos responsivos do módulo de WhatsApp", () => {
  it("usa ResponsiveDialog no detalhe da mensagem", async () => {
    const messageLogs = await readComponent("messageLogs");
    expect(messageLogs).toContain(
      'from "@/components/app/responsive-dialog"',
    );
    expect(messageLogs).toContain("<ResponsiveDialog");
    expect(messageLogs).toContain('title="Mensagem WhatsApp"');
    expect(messageLogs).toContain(
      'contentClassName="sm:max-w-md max-h-[85vh]"',
    );
    expect(messageLogs).not.toContain('from "@/components/ui/dialog"');
  });

  it("usa ResponsiveDialog no convite com trigger preservado", async () => {
    const invitation = await readComponent("invitation");
    expect(invitation).toContain(
      'from "@/components/app/responsive-dialog"',
    );
    expect(invitation).toContain("<ResponsiveDialog");
    expect(invitation).toContain("trigger={");
    expect(invitation).not.toContain('from "@/components/ui/dialog"');
  });

  it("usa ResponsiveDialog no lembrete de cadastro de telefone", async () => {
    const phonePrompt = await readComponent("phonePrompt");
    expect(phonePrompt).toContain(
      'from "@/components/app/responsive-dialog"',
    );
    expect(phonePrompt).toContain("<ResponsiveDialog");
    expect(phonePrompt).not.toContain('from "@/components/ui/dialog"');
  });
});

describe("Reexportação do convite em features/people", () => {
  it("delega para o componente único em components/members", async () => {
    const peopleInvitation = await readComponent("peopleInvitation");
    expect(peopleInvitation).toContain(
      'export { WhatsAppInvitationDialog } from "@/components/members/whatsapp-invitation-dialog";',
    );
    expect(peopleInvitation).not.toContain("useState");
    expect(peopleInvitation).not.toContain("DialogContent");
  });
});
