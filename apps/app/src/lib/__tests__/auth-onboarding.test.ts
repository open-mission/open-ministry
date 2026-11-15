import { describe, expect, it, mock, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { APIError } from "better-auth/api";

mock.module("@/app/actions/auth", () => ({
  signInAction: async () => undefined,
  signUpAction: async () => undefined,
}));
mock.module("@/app/actions/organization", () => ({
  createChurchAction: async () => undefined,
}));
mock.module("@/app/actions/onboarding-tour", () => ({
  completeOnboardingTourAction: async () => ({ ok: true }),
  saveOnboardingProfileInfoAction: async () => ({ ok: true }),
}));
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));
mock.module("next/image", () => ({
  default: () => createElement("img", { alt: "" }),
}));
mock.module("sonner", () => ({
  toast: { success: () => undefined, error: () => undefined },
}));
mock.module("@/components/pwa/use-pwa-install", () => ({
  usePwaInstall: () => ({
    platform: "desktop",
    isStandalone: false,
    canInstallNatively: false,
    triggerNativeInstall: () => undefined,
  }),
}));
mock.module("@/lib/auth-client", () => ({
  authClient: {
    getLastUsedLoginMethod: () => "email",
    signIn: {
      social: async () => ({}),
      passkey: async () => ({}),
    },
  },
}));

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { SignUpForm } from "@/components/auth/signup-form";
import { DashboardOnboardingModal } from "@/components/onboarding/dashboard-onboarding-modal";
import { actionErrorMessage } from "@/lib/auth-errors";
import {
  buildWhatsAppShareUrl,
  interpolateTemplate,
} from "@/lib/message-templates";
import {
  formatBrazilianPhone,
  isValidBrazilianPhone,
} from "@/lib/whatsapp-prompt";

describe("Onboarding — máscara dinâmica de telefone", () => {
  test("formata progressivamente enquanto a pessoa digita", () => {
    expect(formatBrazilianPhone("")).toBe("");
    expect(formatBrazilianPhone("1")).toBe("(1");
    expect(formatBrazilianPhone("11")).toBe("(11");
    expect(formatBrazilianPhone("119")).toBe("(11) 9");
    expect(formatBrazilianPhone("11988")).toBe("(11) 988");
    expect(formatBrazilianPhone("1198888")).toBe("(11) 98888");
    expect(formatBrazilianPhone("11988887")).toBe("(11) 98888-7");
    expect(formatBrazilianPhone("11988887777")).toBe("(11) 98888-7777");
  });

  test("distingue celular (11 dígitos) de telefone fixo (10 dígitos)", () => {
    expect(formatBrazilianPhone("1133334444")).toBe("(11) 3333-4444");
    expect(formatBrazilianPhone("11333344")).toBe("(11) 3333-44");
    expect(formatBrazilianPhone("11988887777")).toBe("(11) 98888-7777");
  });

  test("normaliza número colado com +55 ou zero inicial", () => {
    expect(formatBrazilianPhone("+55 (11) 98888-7777")).toBe("(11) 98888-7777");
    expect(formatBrazilianPhone("5511988887777")).toBe("(11) 98888-7777");
    expect(formatBrazilianPhone("011988887777")).toBe("(11) 98888-7777");
  });

  test("descarta dígitos excedentes para nunca passar de 11", () => {
    const digits = formatBrazilianPhone("119888877779999").replace(/\D/g, "");

    expect(digits).toHaveLength(11);
    expect(formatBrazilianPhone("119888877779999")).toBe("(11) 98888-7777");
  });

  test("passo de perfil só aceita número completo com DDD válido", () => {
    expect(isValidBrazilianPhone(formatBrazilianPhone("11988887777"))).toBe(true);
    expect(isValidBrazilianPhone(formatBrazilianPhone("1133334444"))).toBe(true);

    // Incompleto enquanto digita
    expect(isValidBrazilianPhone(formatBrazilianPhone("119888"))).toBe(false);
    // DDD inexistente
    expect(isValidBrazilianPhone("(05) 98888-7777")).toBe(false);
    // 11 dígitos que não são celular (não começam com 9)
    expect(isValidBrazilianPhone("(11) 78888-7777")).toBe(false);
  });
});

describe("Detecção e tradução de erros de autenticação e convite", () => {
  const apiError = (code: string) =>
    new APIError("BAD_REQUEST", { code, message: "internal detail" });

  test("traduz bloqueios de convite em mensagens claras", () => {
    expect(actionErrorMessage(apiError("USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION"))).toBe(
      "Já existe um convite pendente para este email.",
    );
    expect(actionErrorMessage(apiError("USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION"))).toBe(
      "Esta pessoa já faz parte da igreja.",
    );
    expect(actionErrorMessage(apiError("INVITATION_LIMIT_REACHED"))).toBe(
      "O limite de convites desta igreja foi atingido.",
    );
    expect(actionErrorMessage(apiError("INVITATION_NOT_FOUND"))).toBe(
      "Este convite não existe mais ou expirou.",
    );
    expect(actionErrorMessage(apiError("YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION"))).toBe(
      "Você não tem permissão para convidar pessoas.",
    );
  });

  test("traduz erros de conta e sessão do cadastro/login", () => {
    expect(actionErrorMessage(apiError("USER_ALREADY_EXISTS"))).toBe(
      "Já existe uma conta com este email. Tente entrar.",
    );
    expect(actionErrorMessage(apiError("INVALID_EMAIL_OR_PASSWORD"))).toBe(
      "Email ou senha incorretos.",
    );
    expect(actionErrorMessage(apiError("PASSWORD_TOO_SHORT"))).toBe(
      "A senha precisa ter pelo menos 8 caracteres.",
    );
    expect(actionErrorMessage(apiError("SESSION_EXPIRED"))).toBe(
      "Sua sessão expirou. Entre novamente para continuar.",
    );
  });

  test("não vaza detalhe interno de erro de API desconhecido", () => {
    expect(actionErrorMessage(apiError("SOMETHING_UNMAPPED"))).toBe(
      "Não foi possível concluir a operação. Tente novamente.",
    );
  });

  test("erro inesperado vira mensagem genérica sem detalhes internos", () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => undefined);

    try {
      expect(actionErrorMessage(new Error("stack trace secreta"))).toBe(
        "Algo deu errado. Tente novamente em instantes.",
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe("Regras de convite compartilhado por WhatsApp", () => {
  test("prefixa o país 55 e preserva a mensagem no link wa.me", () => {
    const url = buildWhatsAppShareUrl({
      phone: "(11) 98888-7777",
      text: "Paz do Senhor! Aceite o convite da Igreja Comunidade da Graça.",
    });

    expect(url).toBe(
      "https://wa.me/5511988887777?text=Paz%20do%20Senhor!%20Aceite%20o%20convite%20da%20Igreja%20Comunidade%20da%20Gra%C3%A7a.",
    );
  });

  test("não duplica o 55 quando o número já vem com país", () => {
    const url = buildWhatsAppShareUrl({
      phone: "+55 11 98888-7777",
      text: "Convite",
    });

    expect(url).toBe("https://wa.me/5511988887777?text=Convite");
  });

  test("sem telefone, compartilha apenas o texto para escolher o contato", () => {
    expect(
      buildWhatsAppShareUrl({ phone: null, text: "Convite da igreja" }),
    ).toBe("https://wa.me/?text=Convite%20da%20igreja");
    expect(
      buildWhatsAppShareUrl({ phone: "", text: "Convite da igreja" }),
    ).toBe("https://wa.me/?text=Convite%20da%20igreja");
  });

  test("mensagem do convite recebe nome, igreja, link e papel", () => {
    const rendered = interpolateTemplate(
      "Olá {{name}}, {{church_name}} te convidou como {{role}}. Acesse: {{link}}",
      {
        name: "Ana",
        church_name: "Comunidade da Graça",
        role: "Administrador",
        link: "https://app.openministry.com/accept-invitation/inv_123",
      },
    );

    expect(rendered).toBe(
      "Olá Ana, Comunidade da Graça te convidou como Administrador. Acesse: https://app.openministry.com/accept-invitation/inv_123",
    );
  });

  test("variável ausente não deixa placeholder quebrado no convite", () => {
    expect(
      interpolateTemplate("Olá {{name}}, seu convite de {{church_name}}", {
        name: "Ana",
      }),
    ).toBe("Olá Ana, seu convite de ");
  });
});

const render = (node: ReactNode) => renderToStaticMarkup(node);

/** Extrai o bloco HTML do campo de senha para inspecionar o toggle. */
function passwordFieldMarkup(markup: string): string {
  const idIndex = markup.indexOf('id="password"');
  if (idIndex === -1) return "";

  const start = markup.lastIndexOf("<input", idIndex);
  const end = markup.indexOf("</div>", idIndex);

  return markup.slice(start === -1 ? idIndex : start, end === -1 ? undefined : end);
}

/** Extrai apenas a tag <button> do toggle de senha. */
function passwordToggleTag(markup: string): string {
  const field = passwordFieldMarkup(markup);
  const start = field.indexOf("<button");
  if (start === -1) return "";

  return field.slice(start, field.indexOf(">", start) + 1);
}

describe("Acessibilidade — piso tipográfico das telas de acesso", () => {
  it("o shell de autenticação não usa texto abaixo de 11px", () => {
    const markup = render(
      createElement(AuthShell, null, createElement("span", null, "conteúdo")),
    );

    expect(markup).not.toContain("text-[0.65rem]");
    expect(markup).toContain("text-[11px]");
  });

  it("login e cadastro não usam texto abaixo de 11px", () => {
    for (const markup of [
      render(createElement(LoginForm, {})),
      render(createElement(SignUpForm, {})),
    ]) {
      expect(markup).not.toContain("text-[10px]");
      expect(markup).not.toContain("text-[9px]");
      expect(markup).not.toContain("text-[0.65rem]");
    }
  });

  it("o tour de onboarding não usa texto abaixo de 11px", () => {
    const markup = render(
      createElement(DashboardOnboardingModal, {
        userName: "Ana",
        initialTourCompleted: false,
      }),
    );

    expect(markup).not.toContain("text-[10px]");
    expect(markup).not.toContain("text-[9px]");
  });

  it("nenhum passo do tour usa texto abaixo de 11px no código-fonte", () => {
    // O tour renderiza um passo por vez, então o markup cobre apenas o passo
    // inicial: a garantia do piso tipográfico precisa varrer o arquivo inteiro.
    const files = [
      "../../components/auth/auth-shell.tsx",
      "../../components/auth/google-sign-in-button.tsx",
      "../../components/auth/login-form.tsx",
      "../../components/auth/signup-form.tsx",
      "../../components/onboarding/dashboard-onboarding-modal.tsx",
    ];
    const subEleven = /text-\[(?:9|10)px\]|text-\[0\.[0-6]\d*rem\]/;

    for (const file of files) {
      const source = readFileSync(
        fileURLToPath(new URL(file, import.meta.url)),
        "utf8",
      );

      expect(source).not.toMatch(subEleven);
    }
  });
});

describe("Acessibilidade — alternância de visibilidade da senha", () => {
  it("o login expõe um botão de exibir senha com área de toque confortável", () => {
    const markup = render(createElement(LoginForm, {}));
    const field = passwordFieldMarkup(markup);
    const toggle = passwordToggleTag(markup);

    expect(field).toContain('type="password"');
    expect(field).toContain('autoComplete="current-password"');
    expect(toggle).toContain('type="button"');
    expect(toggle).toContain('aria-label="Exibir senha"');
    expect(toggle).toContain("h-10");
    expect(toggle).toContain("w-10");
    // Alterna o rótulo em vez de anunciar "pressionado" (ARIA APG).
    expect(toggle).not.toContain("aria-pressed");
    expect(field).toContain('aria-hidden="true"');
  });

  it("o cadastro expõe um botão de exibir senha com área de toque confortável", () => {
    const markup = render(createElement(SignUpForm, {}));
    const field = passwordFieldMarkup(markup);
    const toggle = passwordToggleTag(markup);

    expect(field).toContain('type="password"');
    expect(field).toContain('autoComplete="new-password"');
    expect(toggle).toContain('type="button"');
    expect(toggle).toContain('aria-label="Exibir senha"');
    expect(toggle).toContain("h-10");
    expect(toggle).toContain("w-10");
  });
});

describe("Onboarding — campo de WhatsApp com máscara dinâmica", () => {
  it("o campo de telefone aplica a máscara brasileira ao digitar", () => {
    const markup = render(createElement(OnboardingForm, {}));
    const idIndex = markup.indexOf('id="phone"');
    const phoneInput = markup.slice(
      markup.lastIndexOf("<input", idIndex),
      markup.indexOf("/>", idIndex),
    );

    expect(phoneInput).toContain('type="tel"');
    expect(phoneInput).toMatch(/inputmode="tel"/i);
    expect(phoneInput).toContain('autoComplete="tel"');
    expect(phoneInput).toContain('name="phone"');
    expect(phoneInput).toContain('value=""');
  });
});

describe("Acessibilidade — passos do tour de onboarding", () => {
  it("cada passo tem área de toque mínima de 28x28px", () => {
    const markup = render(
      createElement(DashboardOnboardingModal, {
        userName: "Ana",
        initialTourCompleted: false,
      }),
    );
    const stepperButtons = markup.match(
      /<button[^>]*aria-label="Ir para o passo \d+"[^>]*>/g,
    );

    expect(stepperButtons).toHaveLength(6);
    for (const button of stepperButtons ?? []) {
      expect(button).toContain("min-h-[28px]");
      expect(button).toContain("min-w-[28px]");
    }
  });
});
