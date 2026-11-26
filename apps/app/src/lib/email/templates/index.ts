import * as React from "react";
import { render } from "@react-email/components";

import { WelcomeEmail, type WelcomeEmailProps } from "./welcome-email";
import {
  ResetPasswordEmail,
  type ResetPasswordEmailProps,
} from "./reset-password-email";
import { MagicLinkEmail, type MagicLinkEmailProps } from "./magic-link-email";
import {
  EmailVerificationEmail,
  type EmailVerificationEmailProps,
} from "./email-verification-email";
import {
  ScheduleAssignedEmail,
  type ScheduleAssignedEmailProps,
} from "./schedule-assigned-email";
import {
  AnnouncementEmail,
  type AnnouncementEmailProps,
} from "./announcement-email";
import {
  RehearsalReminderEmail,
  type RehearsalReminderEmailProps,
} from "./rehearsal-reminder-email";

export * from "./base-layout";
export * from "./welcome-email";
export * from "./reset-password-email";
export * from "./magic-link-email";
export * from "./email-verification-email";
export * from "./schedule-assigned-email";
export * from "./announcement-email";
export * from "./rehearsal-reminder-email";

export type EmailTemplateKey =
  | "welcome"
  | "reset_password"
  | "magic_link"
  | "email_verification"
  | "assignment"
  | "announcement"
  | "rehearsal_reminder";

export type EmailTemplateMeta = {
  key: EmailTemplateKey;
  name: string;
  category: "auth" | "escala" | "comunicacao";
  description: string;
  defaultSubject: string;
  sampleData: Record<string, unknown>;
  renderComponent: (props: Record<string, unknown>) => React.ReactElement;
};

export const EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplateMeta> = {
  welcome: {
    key: "welcome",
    name: "Boas-vindas (Novo Usuário)",
    category: "auth",
    description:
      "Enviado automaticamente quando uma pessoa se cadastra no OpenMinistry.",
    defaultSubject: "Bem-vindo ao OpenMinistry 👋",
    sampleData: {
      name: "Gabriel Santos",
      churchName: "Igreja Central",
      dashboardUrl: "https://openministry.app/",
    },
    renderComponent: (props) =>
      React.createElement(WelcomeEmail, props as unknown as WelcomeEmailProps),
  },
  reset_password: {
    key: "reset_password",
    name: "Redefinição de Senha",
    category: "auth",
    description:
      "Enviado quando o usuário solicita a recuperação ou troca de senha.",
    defaultSubject: "Redefinição de senha do OpenMinistry",
    sampleData: {
      name: "Gabriel Santos",
      resetUrl: "https://openministry.app/auth/reset-password?token=sample-token-123",
      expiresInMinutes: 60,
    },
    renderComponent: (props) =>
      React.createElement(
        ResetPasswordEmail,
        props as unknown as ResetPasswordEmailProps,
      ),
  },
  magic_link: {
    key: "magic_link",
    name: "Link Mágico (Acesso Direto)",
    category: "auth",
    description:
      "Enviado para login rápido sem senha por link seguro descartável.",
    defaultSubject: "Seu link de acesso ao OpenMinistry",
    sampleData: {
      name: "Gabriel Santos",
      magicLinkUrl:
        "https://openministry.app/api/auth/magic-link?token=sample-token-456",
    },
    renderComponent: (props) =>
      React.createElement(
        MagicLinkEmail,
        props as unknown as MagicLinkEmailProps,
      ),
  },
  email_verification: {
    key: "email_verification",
    name: "Verificação de Email",
    category: "auth",
    description:
      "Enviado para confirmar a propriedade do endereço de email cadastrado.",
    defaultSubject: "Confirme seu endereço de email",
    sampleData: {
      name: "Gabriel Santos",
      verifyUrl:
        "https://openministry.app/api/auth/verify-email?token=sample-token-789",
    },
    renderComponent: (props) =>
      React.createElement(
        EmailVerificationEmail,
        props as unknown as EmailVerificationEmailProps,
      ),
  },
  assignment: {
    key: "assignment",
    name: "Nova Escala de Culto",
    category: "escala",
    description:
      "Notificação enviada ao voluntário quando ele é escalado em um culto ou evento.",
    defaultSubject: "Você foi escalado(a) no Culto de Celebração",
    sampleData: {
      name: "Gabriel Santos",
      churchName: "Igreja Central",
      eventTitle: "Culto de Celebração de Domingo",
      functionName: "Louvor & Adoração — Bateria",
      eventDate: "Domingo, 15 de Novembro de 2026",
      eventTime: "19:00",
      eventUrl: "https://openministry.app/events/sample-event-123",
      notes: "Chegada dos voluntários para passagem de som às 17:30.",
    },
    renderComponent: (props) =>
      React.createElement(
        ScheduleAssignedEmail,
        props as unknown as ScheduleAssignedEmailProps,
      ),
  },
  announcement: {
    key: "announcement",
    name: "Aviso da Igreja",
    category: "comunicacao",
    description:
      "Comunicado geral ou por ministério enviado pela liderança da igreja.",
    defaultSubject: "Aviso importante sobre o ensaio geral",
    sampleData: {
      name: "Gabriel Santos",
      churchName: "Igreja Central",
      title: "Ensaio Geral e Alinhamento de Equipes",
      body: "Paz a todos! Lembramos que nesta sexta-feira teremos nosso alinhamento geral com todas as equipes de louvor, mídia e recepção a partir das 20h no templo principal.",
      authorName: "Pr. Marcos Silva",
      announcementUrl: "https://openministry.app/notifications",
    },
    renderComponent: (props) =>
      React.createElement(
        AnnouncementEmail,
        props as unknown as AnnouncementEmailProps,
      ),
  },
  rehearsal_reminder: {
    key: "rehearsal_reminder",
    name: "Lembrete de Ensaio",
    category: "escala",
    description:
      "Enviado automaticamente aos membros escalados com os detalhes e o repertório do próximo ensaio.",
    defaultSubject: "Lembrete de Ensaio",
    sampleData: {
      name: "Gabriel Santos",
      churchName: "Igreja Central",
      eventTitle: "Ensaio Geral de Louvor",
      eventDate: "Sexta-feira, 20 de Novembro de 2026",
      eventTime: "19:30",
      location: "Templo principal",
      songs: ["Grande é o Senhor", "Teu Sangue", "Nada Além do Sangue"],
      notes: "Chegar 15 minutos antes para a passagem de som.",
      rehearsalUrl: "https://openministry.app/rehearsals",
    },
    renderComponent: (props) =>
      React.createElement(
        RehearsalReminderEmail,
        props as unknown as RehearsalReminderEmailProps,
      ),
  },
};

/**
 * Item serializável do catálogo de modelos, seguro para atravessar a
 * fronteira servidor → cliente (sem componentes React nem dados fictícios).
 */
export type EmailTemplateCatalogItem = Pick<
  EmailTemplateMeta,
  "key" | "name" | "category" | "description" | "defaultSubject"
>;

/**
 * Lista os modelos disponíveis com apenas metadados serializáveis, para que
 * o catálogo não dependa de listas duplicadas no cliente.
 */
export function listEmailTemplateCatalog(): EmailTemplateCatalogItem[] {
  return Object.values(EMAIL_TEMPLATES).map(
    ({ key, name, category, description, defaultSubject }) => ({
      key,
      name,
      category,
      description,
      defaultSubject,
    }),
  );
}

export type RenderTemplateOptions = {
  /**
   * Quando `false`, não faz fallback nos dados fictícios do modelo. Use em
   * envios reais para não vazar nomes, notas ou músicas de exemplo.
   */
  useSampleData?: boolean;
};

/**
 * Renderiza um template React Email em HTML string.
 */
export async function renderTemplateHtml(
  key: EmailTemplateKey,
  props: Record<string, unknown>,
  options?: RenderTemplateOptions,
): Promise<{ html: string; subject: string }> {
  const meta = EMAIL_TEMPLATES[key];
  if (!meta) {
    throw new Error(`Template de email desconhecido: ${key}`);
  }

  const mergedProps =
    options?.useSampleData === false
      ? { ...props }
      : { ...meta.sampleData, ...props };
  const element = meta.renderComponent(mergedProps);
  const html = await render(element);

  let subject = meta.defaultSubject;
  if (typeof mergedProps.subject === "string" && mergedProps.subject) {
    subject = mergedProps.subject;
  } else if (
    key === "assignment" &&
    typeof mergedProps.eventTitle === "string" &&
    mergedProps.eventTitle
  ) {
    subject = `Você foi escalado(a) em ${mergedProps.eventTitle}`;
  } else if (
    key === "announcement" &&
    typeof mergedProps.title === "string" &&
    mergedProps.title
  ) {
    subject = mergedProps.title;
  } else if (
    key === "rehearsal_reminder" &&
    typeof mergedProps.eventTitle === "string" &&
    mergedProps.eventTitle
  ) {
    subject = `Lembrete de Ensaio - ${mergedProps.eventTitle}`;
  }

  return { html, subject };
}
