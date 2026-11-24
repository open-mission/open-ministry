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
import {
  DashboardOnboardingModal,
  ProfileCompletenessRing,
} from "@/components/onboarding/dashboard-onboarding-modal";
import {
  WELCOME_GUIDE_CHAPTERS,
  WelcomeGuideContent,
} from "@/components/onboarding/welcome-guide-content";
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

function sourceOf(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

function guideMarkup(
  isMobile: boolean,
  activeChapter = 0,
  extra: { initialPhone?: string | null; initialBirthday?: string | null } = {},
): string {
  return render(
    createElement(WelcomeGuideContent, {
      activeChapter,
      onSelectChapter: () => undefined,
      onSkip: () => undefined,
      onNext: () => undefined,
      isMobile,
      ...extra,
    }),
  );
}

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

  it("o guia de boas-vindas não usa texto abaixo de 11px", () => {
    for (const markup of [guideMarkup(false), guideMarkup(true)]) {
      expect(markup).not.toContain("text-[10px]");
      expect(markup).not.toContain("text-[9px]");
      expect(markup).not.toContain("text-[0.65rem]");
    }
  });

  it("nenhum capítulo do guia usa texto abaixo de 11px no código-fonte", () => {
    // O guia renderiza um capítulo por vez, então o markup cobre apenas o
    // capítulo inicial: a garantia do piso tipográfico precisa varrer os
    // arquivos inteiros.
    const files = [
      "../../components/auth/auth-shell.tsx",
      "../../components/auth/google-sign-in-button.tsx",
      "../../components/auth/login-form.tsx",
      "../../components/auth/signup-form.tsx",
      "../../components/onboarding/dashboard-onboarding-modal.tsx",
      "../../components/onboarding/welcome-guide-content.tsx",
    ];
    const subEleven = /text-\[(?:9|10)px\]|text-\[0\.[0-6]\d*rem\]/;

    for (const file of files) {
      expect(sourceOf(file)).not.toMatch(subEleven);
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

describe("Onboarding — anel de progresso circular do perfil", () => {
  const CIRCUMFERENCE = 2 * Math.PI * 50;

  const circleTags = (markup: string): string[] =>
    markup.match(/<circle[^>]*>/g) ?? [];

  const attribute = (tag: string, name: string): string | null => {
    const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
    return match?.[1] ?? null;
  };

  it("desenha trilha e progresso como círculos SVG com strokeDashoffset calculado", () => {
    const markup = render(
      createElement(ProfileCompletenessRing, { completeness: 50 }),
    );
    const circles = circleTags(markup);

    expect(circles).toHaveLength(2);

    const [track, progress] = circles;
    expect(track).toContain('stroke="currentColor"');
    expect(track).toContain('stroke-width="6"');
    expect(track).toContain('fill="none"');
    expect(track).toContain("text-emerald-500/30");

    expect(progress).toContain('stroke="currentColor"');
    expect(progress).toContain('stroke-width="6"');
    expect(progress).toContain('fill="none"');
    expect(progress).toContain('stroke-linecap="round"');
    expect(progress).toContain("text-emerald-400");
    expect(attribute(progress, "r")).toBe("50");
    expect(Number(attribute(progress, "stroke-dasharray"))).toBeCloseTo(
      CIRCUMFERENCE,
      6,
    );
    expect(Number(attribute(progress, "stroke-dashoffset"))).toBeCloseTo(
      CIRCUMFERENCE / 2,
      6,
    );
  });

  it("a 100% zera o offset e fecha o anel sem abertura", () => {
    const markup = render(
      createElement(ProfileCompletenessRing, { completeness: 100 }),
    );
    const progress = circleTags(markup)[1];

    expect(Number(attribute(progress, "stroke-dashoffset"))).toBe(0);
    expect(markup).toContain("100%");
    expect(markup).toContain("Completo");
  });

  it("a 0% mantém o anel vazio, iniciando às 12 horas com o texto central", () => {
    const markup = render(
      createElement(ProfileCompletenessRing, { completeness: 0 }),
    );
    const progress = circleTags(markup)[1];

    expect(Number(attribute(progress, "stroke-dashoffset"))).toBeCloseTo(
      CIRCUMFERENCE,
      6,
    );
    expect(markup).toContain('viewBox="0 0 112 112"');
    expect(markup).toContain("-rotate-90");
    expect(markup).toContain("0%");
    expect(markup).toContain("Completo");
    expect(markup).toContain(
      "text-[11px] font-medium uppercase tracking-wider text-emerald-300",
    );
  });

  it("é anunciado como barra de progresso acessível", () => {
    const markup = render(
      createElement(ProfileCompletenessRing, { completeness: 50 }),
    );

    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="50"');
    expect(markup).toContain('aria-valuemin="0"');
    expect(markup).toContain('aria-valuemax="100"');
  });

  it("não deixa nenhum clip-path quebrado no código-fonte do tour", () => {
    const source = sourceOf(
      "../../components/onboarding/dashboard-onboarding-modal.tsx",
    );

    expect(source).not.toContain("clipPath");
    expect(source).not.toContain("polygon(");
  });
});

describe("Guia de boas-vindas — conteúdo dos três capítulos", () => {
  it("tem exatamente três capítulos", () => {
    expect(WELCOME_GUIDE_CHAPTERS).toHaveLength(3);
    expect(WELCOME_GUIDE_CHAPTERS.map((chapter) => chapter.id)).toEqual([
      "areas",
      "schedules",
      "profile",
    ]);
  });

  it("desktop mostra os títulos dos três capítulos", () => {
    const markup = guideMarkup(false);

    expect(markup).toContain("1 · Onde tudo fica");
    expect(markup).toContain("2 · Suas escalas e avisos");
    expect(markup).toContain("3 · Seu perfil e o app no celular");
  });

  it("abre o capítulo 1 por padrão com o selo Agora", () => {
    const markup = guideMarkup(false);

    expect(markup).toContain("Agora");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("Cultos &amp; Escalas");
    expect(markup).toContain("Agenda, escalas e disponibilidade");
    expect(markup).toContain("Músicas, cifras e ensaios");
    expect(markup).toContain("Membros, equipes e aniversários");
    expect(markup).toContain(
      "No celular, todas essas áreas abrem no botão Explorar.",
    );
  });

  it("capítulos são botões expansíveis controlados", () => {
    const markup = guideMarkup(false);
    const chapterButtons =
      markup.match(/<button[^>]*aria-expanded="(?:true|false)"/g) ?? [];

    expect(chapterButtons).toHaveLength(3);
    expect(
      chapterButtons.filter((button) => button.includes('"true"')),
    ).toHaveLength(1);
    expect(
      markup.match(/aria-controls="welcome-guide-chapter-/g) ?? [],
    ).toHaveLength(3);
  });

  it("mobile dedica o capítulo 1 ao botão Explorar", () => {
    const markup = guideMarkup(true);

    expect(markup).toContain("1 · Conheça o botão Explorar");
    expect(markup).toContain(
      "Toque em Explorar para abrir todas as 6 áreas da igreja.",
    );
    expect(markup).toContain("Início");
    expect(markup).toContain("Escalas");
    expect(markup).toContain("Agenda");
    expect(markup).toContain("Músicas");
    expect(markup).toContain("Explorar");
    expect(markup).toContain("bg-primary/10");
    expect(markup).toContain("border-primary/30");
  });

  it("capítulo 2 explica presença, disponibilidade e avisos com atalho para escalas", () => {
    const markup = guideMarkup(false, 1);

    expect(markup).toContain("Confirmar presença e avisar disponibilidade");
    expect(markup).toContain("próxima escala aparece logo no topo");
    expect(markup).toContain("Disponibilidade");
    expect(markup).toContain("WhatsApp");
    expect(markup).toContain('href="/dashboard/schedules"');
  });

  it("capítulo 3 leva ao Perfil sem renderizar campos de telefone ou aniversário", () => {
    const markup = guideMarkup(false, 2);

    expect(markup).toContain(
      "WhatsApp e aniversário no Perfil",
    );
    expect(markup).toContain("scope=account");
    expect(markup).toContain("tab=profile");
    expect(markup).toContain("Abrir Perfil");
    expect(markup).toContain("Adicionar à tela inicial no celular");
    expect(markup).toContain("tab=app");

    for (const variant of [guideMarkup(false, 2), guideMarkup(true, 2)]) {
      expect(variant).not.toContain("<input");
      expect(variant).not.toContain("<textarea");
      expect(variant).not.toContain('type="tel"');
      expect(variant).not.toContain('type="date"');
    }
  });

  it("mostra Preenchido quando telefone e aniversário já existem", () => {
    const complete = guideMarkup(false, 2, {
      initialPhone: "(11) 98888-7777",
      initialBirthday: "1990-05-12",
    });
    const incomplete = guideMarkup(false, 2);

    expect(complete).toContain("Preenchido");
    expect(incomplete).not.toContain("Preenchido");
  });

  it("rodapé conclui no último capítulo e oferece pular por agora", () => {
    const first = guideMarkup(false, 0);
    const last = guideMarkup(false, 2);

    expect(first).toContain("Pular por agora");
    expect(first).toContain("Próximo capítulo");
    expect(last).toContain("Concluir guia");
    expect(last).not.toContain("Próximo capítulo");
  });

  it("no mobile as ações têm alvo mínimo de 44px", () => {
    const markup = guideMarkup(true);

    expect(markup).toContain("min-h-11");
    expect(
      markup.match(/min-h-11/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("Guia de boas-vindas — painéis responsivos", () => {
  const modalSource = () =>
    sourceOf("../../components/onboarding/dashboard-onboarding-modal.tsx");

  it("desktop usa Sheet lateral direito não modal com a Home clicável", () => {
    const source = modalSource();

    expect(source).toContain("<Sheet");
    expect(source).toContain("modal={false}");
    expect(source).toContain('side="right"');
    expect(source).toContain("sm:max-w-sm");
    expect(source).toContain("bg-card");
    expect(source).toContain("border-l");
    expect(source).toContain("border-border");
    expect(source).toContain("onInteractOutside");
    expect(source).toContain("onOpenAutoFocus");
    expect(source).toContain("showOverlay={false}");
  });

  it("mobile usa Drawer inferior com o visual padrão e rolagem sem arrastar", () => {
    const source = modalSource();
    const contentSource = sourceOf(
      "../../components/onboarding/welcome-guide-content.tsx",
    );

    expect(source).toContain("<Drawer");
    expect(source).toContain("max-h-[85dvh]");
    expect(source).toContain("rounded-t-xl");
    expect(source).toContain("bg-popover");
    expect(source).toContain("!text-left");
    expect(source).toContain("min-h-11 min-w-11");
    expect(source).toContain("BOAS-VINDAS · 3 CAPÍTULOS");
    expect(contentSource).toContain("env(safe-area-inset-bottom)");
    expect(contentSource).toContain('data-vaul-no-drag=""');
  });

  it("detecta o dispositivo só depois da hidratação", () => {
    const source = modalSource();

    expect(source).toContain("useMounted()");
    expect(source).toContain("useStableIsMobile(isOpen && mounted)");
    expect(source).toContain("if (!mounted) return null;");
  });

  it("o servidor não renderiza o painel antes da hidratação", () => {
    const markup = render(
      createElement(DashboardOnboardingModal, {
        userName: "Ana",
        initialTourCompleted: false,
      }),
    );

    expect(markup).toBe("");
  });

  it("evento de reabertura, telemetria e persistência continuam ligados", () => {
    const source = modalSource();

    expect(source).toContain('"open-onboarding-tour"');
    expect(source).toContain('"onboarding.tour.reopened"');
    expect(source).toContain('"onboarding.step_viewed"');
    expect(source).toContain("completeOnboardingTourAction()");
  });

  it("respeita prefers-reduced-motion nos dois painéis", () => {
    const sources = [
      modalSource(),
      sourceOf("../../components/onboarding/welcome-guide-content.tsx"),
    ];

    for (const source of sources) {
      expect(source).toContain("motion-reduce:transition-none");
    }
    expect(
      sourceOf("../../components/onboarding/welcome-guide-content.tsx"),
    ).toContain("motion-reduce:animate-none");
  });

  it("o menu do avatar oferece Rever tour no desktop e no mobile", () => {
    const source = sourceOf("../../components/app/user-menu-drawer.tsx");

    expect(source.match(/Rever tour/g)).toHaveLength(2);
    expect(source).not.toContain("Tour da Plataforma");
    expect(source.match(/open-onboarding-tour/g)).toHaveLength(2);
  });
});
