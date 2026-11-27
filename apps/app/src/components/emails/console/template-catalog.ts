import {
  CalendarDaysIcon,
  KeyRoundIcon,
  MegaphoneIcon,
  Music2Icon,
  SparklesIcon,
  UserCheckIcon,
  UserPlusIcon,
} from "lucide-react";

import type { TemplateCardInfo } from "./types";

export const TEMPLATE_CARDS: TemplateCardInfo[] = [
  {
    key: "welcome",
    name: "Boas-vindas (Novo Usuário)",
    category: "auth",
    categoryLabel: "Autenticação",
    description:
      "Enviado automaticamente quando uma nova pessoa cria sua conta no OpenMinistry.",
    defaultSubject: "Bem-vindo ao OpenMinistry 👋",
    icon: UserPlusIcon,
  },
  {
    key: "assignment",
    name: "Nova Escala de Culto",
    category: "escala",
    categoryLabel: "Escalas",
    description:
      "Notificação enviada ao voluntário quando ele é escalado em um culto ou evento.",
    defaultSubject: "Você foi escalado(a) no Culto de Celebração",
    icon: CalendarDaysIcon,
  },
  {
    key: "announcement",
    name: "Aviso da Igreja",
    category: "comunicacao",
    categoryLabel: "Comunicação",
    description:
      "Comunicado geral ou ministerial publicado pela liderança da igreja.",
    defaultSubject: "Comunicado oficial da igreja",
    icon: MegaphoneIcon,
  },
  {
    key: "rehearsal_reminder",
    name: "Lembrete de Ensaio",
    category: "escala",
    categoryLabel: "Ensaios",
    description:
      "Lembrete enviado aos integrantes com os detalhes e o repertório do próximo ensaio.",
    defaultSubject: "Lembrete de Ensaio",
    icon: Music2Icon,
  },
  {
    key: "reset_password",
    name: "Redefinição de Senha",
    category: "auth",
    categoryLabel: "Autenticação",
    description:
      "Enviado com link seguro temporário para troca ou recuperação de senha.",
    defaultSubject: "Redefinição de senha do OpenMinistry",
    icon: KeyRoundIcon,
  },
  {
    key: "magic_link",
    name: "Link Mágico (Acesso Direto)",
    category: "auth",
    categoryLabel: "Autenticação",
    description:
      "Permite login instantâneo e seguro sem necessidade de senha.",
    defaultSubject: "Seu link de acesso ao OpenMinistry",
    icon: SparklesIcon,
  },
  {
    key: "email_verification",
    name: "Confirmação de Email",
    category: "auth",
    categoryLabel: "Autenticação",
    description:
      "Confirma a propriedade do email cadastrado para ativar todos os recursos.",
    defaultSubject: "Confirme seu endereço de email",
    icon: UserCheckIcon,
  },
];
