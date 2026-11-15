/**
 * Modelos prontos de comunicado.
 *
 * Ficam fora do componente para que os textos pastorais possam ser revisados e
 * testados sem renderizar a interface (limites de caracteres e linguagem
 * acessível, sem jargão de fornecedor).
 */

export type AnnouncementPresetIcon =
  | "megaphone"
  | "check"
  | "clock"
  | "shield"
  | "sparkles";

export type AnnouncementPreset = {
  id: string;
  label: string;
  icon: AnnouncementPresetIcon;
  title: string;
  body: string;
};

export const ANNOUNCEMENT_PRESETS: AnnouncementPreset[] = [
  {
    id: "general",
    label: "Comunicado Geral",
    icon: "megaphone",
    title: "Comunicado Importante da Liderança",
    body: "Olá a todos! Gostaríamos de compartilhar um comunicado importante sobre as atividades e programações da nossa comunidade nesta semana. Fiquem atentos às orientações e que Deus abençoe!",
  },
  {
    id: "schedule",
    label: "Escala do Final de Semana",
    icon: "check",
    title: "Confirmação de Escala do Domingo",
    body: "Atenção voluntários escalados para este domingo: por favor, confirmem sua presença no aplicativo ou avisem com antecedência caso necessitem de substituição. Contamos com vocês!",
  },
  {
    id: "rehearsal",
    label: "Ensaio e Reunião",
    icon: "clock",
    title: "Lembrete: Ensaio e Alinhamento de Equipe",
    body: "Olá equipe! Nosso ensaio/reunião de alinhamento está confirmado. Pedimos que cheguem com 15 minutos de antecedência para oração inicial e organização dos materiais.",
  },
  {
    id: "urgent",
    label: "Aviso Urgente",
    icon: "shield",
    title: "Aviso Urgente: Alteração no Cronograma",
    body: "Informamos que houve uma alteração importante de horário e programação no nosso encontro. Por favor, verifiquem o aplicativo para conferir todos os detalhes atualizados.",
  },
  {
    id: "gratitude",
    label: "Agradecimento",
    icon: "sparkles",
    title: "Agradecimento pelo Culto Abençoado",
    body: "Queremos agradecer de coração a cada irmão e voluntário pelo serviço e dedicação no último culto. O empenho de vocês fez toda a diferença na vida da igreja!",
  },
];
