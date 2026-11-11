export type MessageTemplateType =
  | "invite_church"
  | "save_contact"
  | "invite_department"
  | "assignment"
  | "monthly_availability"
  | "welcome"
  | "announcement";

export type TemplateVariable = {
  key: string;
  label: string;
  example: string;
  description: string;
};

export type TemplateDefinition = {
  type: MessageTemplateType;
  title: string;
  description: string;
  category: "invites" | "schedules" | "general";
  defaultContent: string;
  variables: TemplateVariable[];
};

export const COMMON_VARIABLES: TemplateVariable[] = [
  {
    key: "name",
    label: "Nome",
    example: "Gabriel Silva",
    description: "Nome da pessoa convidada ou notificada",
  },
  {
    key: "church_name",
    label: "Nome da Igreja",
    example: "Igreja da Cidade",
    description: "Nome oficial da sua comunidade no OpenMinistry",
  },
  {
    key: "link",
    label: "Link de Ação",
    example: "https://openministry.app/accept-invitation/xyz123",
    description: "Link seguro para aceite, confirmação ou acesso ao painel",
  },
  {
    key: "church_phone",
    label: "WhatsApp da Igreja",
    example: "+55 (11) 98765-4321",
    description: "Número do WhatsApp oficial usado nos disparos",
  },
];

export const TEMPLATE_DEFINITIONS: Record<MessageTemplateType, TemplateDefinition> = {
  invite_church: {
    type: "invite_church",
    title: "Convite para a Igreja",
    description: "Mensagem enviada com o link de cadastro quando um novo membro é convidado para a plataforma.",
    category: "invites",
    defaultContent:
      `👋 *Olá, {{name}}!*\n\n` +
      `Você foi convidado(a) para fazer parte da comunidade *{{church_name}}* no OpenMinistry!\n\n` +
      `Com o aplicativo, você poderá acompanhar sua escala nos cultos, marcar seus dias disponíveis e se conectar com sua equipe.\n\n` +
      `👉 *Clique no link abaixo para aceitar o convite e criar sua conta:*\n` +
      `{{link}}\n\n` +
      `_Seja muito bem-vindo(a) à equipe!_`,
    variables: [
      ...COMMON_VARIABLES,
      {
        key: "role",
        label: "Papel",
        example: "Membro",
        description: "Papel atribuído (ex: Membro, Administrador)",
      },
    ],
  },

  save_contact: {
    type: "save_contact",
    title: "Mensagem para Salvar Contato",
    description: "Orienta o voluntário a salvar o número oficial da igreja na agenda do WhatsApp, evitando banimentos e bloqueios de spam.",
    category: "invites",
    defaultContent:
      `📱 *Salve o nosso WhatsApp - {{church_name}}*\n\n` +
      `Olá, *{{name}}*! Tudo bem?\n\n` +
      `Este é o canal oficial de notificações e escalas da *{{church_name}}* via OpenMinistry.\n\n` +
      `⚠️ *Muito importante:* Adicione e salve este número nos seus contatos do celular como *{{church_name}}*.\n\n` +
      `Salvar nosso contato na sua agenda garante que você receba todos os avisos de escalas, lembretes de cultos e comunicações da liderança sem que o WhatsApp bloqueie as mensagens como spam.\n\n` +
      `Obrigado por servir conosco! 🙏`,
    variables: [
      ...COMMON_VARIABLES,
      {
        key: "whatsapp_name",
        label: "Nome do Canal",
        example: "Comunicação Oficial",
        description: "Identificação ou nome da linha do WhatsApp",
      },
    ],
  },

  invite_department: {
    type: "invite_department",
    title: "Convite para Departamento",
    description: "Mensagem enviada quando alguém é adicionado ou convidado para um departamento específico (ex: Louvor, Mídia).",
    category: "invites",
    defaultContent:
      `🤝 *Convite de Equipe - {{church_name}}*\n\n` +
      `Olá, *{{name}}*!\n\n` +
      `Você foi convidado(a) para participar do departamento *{{department_name}}* na *{{church_name}}*.\n\n` +
      `Para visualizar os integrantes, escalas e funções da equipe, acesse o painel:\n` +
      `{{link}}\n\n` +
      `Estamos felizes em ter você servindo com a gente!`,
    variables: [
      ...COMMON_VARIABLES,
      {
        key: "department_name",
        label: "Departamento",
        example: "Ministério de Louvor",
        description: "Nome do departamento para o qual foi convidado",
      },
      {
        key: "role",
        label: "Função / Papel",
        example: "Líder de Equipe",
        description: "Papel dentro do departamento",
      },
    ],
  },

  assignment: {
    type: "assignment",
    title: "Escala de Culto / Serviço",
    description: "Mensagem enviada automaticamente quando um voluntário é escalado em um culto ou evento.",
    category: "schedules",
    defaultContent:
      `📋 *Nova Escala de Culto - {{church_name}}*\n\n` +
      `Olá, *{{name}}*! Você foi escalado(a) para servir na equipe:\n\n` +
      `• *Evento:* {{event_title}}\n` +
      `• *Função:* {{function_name}}\n` +
      `• *Data:* {{event_date}}\n` +
      `• *Horário:* {{event_time}}\n\n` +
      `Acesse o painel para visualizar o cronograma completo do culto e confirmar sua presença:\n` +
      `{{link}}`,
    variables: [
      ...COMMON_VARIABLES,
      {
        key: "event_title",
        label: "Culto / Evento",
        example: "Culto da Família",
        description: "Título do culto ou evento",
      },
      {
        key: "function_name",
        label: "Função",
        example: "Teclado",
        description: "Nome da função designada",
      },
      {
        key: "event_date",
        label: "Data",
        example: "Domingo, 15 de Novembro",
        description: "Data de realização do culto",
      },
      {
        key: "event_time",
        label: "Horário",
        example: "19:00",
        description: "Horário de início ou chegada",
      },
    ],
  },

  monthly_availability: {
    type: "monthly_availability",
    title: "Disponibilidade Mensal",
    description: "Lembrete enviado aos voluntários para marcarem dias e turnos livres para o próximo mês.",
    category: "schedules",
    defaultContent:
      `🗓️ *Disponibilidade para Servir - {{church_name}}*\n\n` +
      `Olá, *{{name}}*! O novo mês está chegando.\n\n` +
      `Por favor, informe os dias e turnos em que você poderá servir na igreja este mês. Isso ajuda muito a liderança a montar as escalas sem sobrecarregar ninguém:\n\n` +
      `👉 *Preencha sua disponibilidade aqui:*\n` +
      `{{link}}\n\n` +
      `Agradecemos muito por sua dedicação!`,
    variables: [
      ...COMMON_VARIABLES,
      {
        key: "month_name",
        label: "Mês de Referência",
        example: "Dezembro",
        description: "Mês ao qual a escala se refere",
      },
    ],
  },

  welcome: {
    type: "welcome",
    title: "Boas-vindas ao App",
    description: "Mensagem de boas-vindas após o membro confirmar seu cadastro no sistema.",
    category: "general",
    defaultContent:
      `👋 *Olá, {{name}}!* Seja muito bem-vindo(a) ao *OpenMinistry* da *{{church_name}}*!\n\n` +
      `Seu WhatsApp foi registrado com sucesso. Você receberá aqui as confirmações de escalas dos cultos e avisos importantes da liderança.\n\n` +
      `Acesse seu painel quando desejar:\n` +
      `{{link}}`,
    variables: [...COMMON_VARIABLES],
  },

  announcement: {
    type: "announcement",
    title: "Avisos & Comunicados Gerais",
    description: "Modelo padrão para avisos gerais enviados pela liderança da igreja.",
    category: "general",
    defaultContent:
      `📢 *Aviso da Liderança - {{church_name}}*\n\n` +
      `*{{title}}*\n\n` +
      `{{body}}\n\n` +
      `Para mais informações e detalhes, acesse:\n` +
      `{{link}}`,
    variables: [
      ...COMMON_VARIABLES,
      {
        key: "title",
        label: "Título do Aviso",
        example: "Ensaio Geral Neste Sábado",
        description: "Título ou assunto principal do aviso",
      },
      {
        key: "body",
        label: "Conteúdo do Aviso",
        example: "Nos reuniremos às 15h no templo principal.",
        description: "Corpo do texto do comunicado",
      },
    ],
  },
};

/**
 * Replaces {{variable_name}} tokens with supplied values.
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    return val != null ? String(val) : "";
  });
}

/**
 * Returns WhatsApp click-to-chat URL (wa.me) with pre-filled message.
 */
export function buildWhatsAppShareUrl(options: {
  phone?: string | null;
  text: string;
}): string {
  const { phone, text } = options;
  const encodedText = encodeURIComponent(text);
  if (phone) {
    const cleanDigits = phone.replace(/\D/g, "");
    const formatted = cleanDigits.length === 10 || cleanDigits.length === 11 ? `55${cleanDigits}` : cleanDigits;
    return `https://wa.me/${formatted}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

export type ResolvedTemplate = {
  type: MessageTemplateType;
  title: string;
  description: string;
  category: "invites" | "schedules" | "general";
  content: string;
  defaultContent: string;
  isCustomized: boolean;
  variables: TemplateVariable[];
};
