/**
 * Regras compartilhadas do módulo de Avisos & Notificações.
 *
 * Os limites de caracteres e a validação de canais precisam ser idênticos no
 * formulário do sino, no console de avisos e nas mensagens de erro, para que
 * voluntários e líderes tenham a mesma experiência em qualquer tela.
 */

export const ANNOUNCEMENT_TITLE_MAX_LENGTH = 80;
export const ANNOUNCEMENT_BODY_MAX_LENGTH = 500;

export const ANNOUNCEMENT_DIALOG_CHANNEL_WARNING =
  "Selecione ao menos um canal para enviar o comunicado.";

export const ANNOUNCEMENT_CONSOLE_CHANNEL_WARNING =
  "Selecione ao menos um canal de notificação para disparar o comunicado.";

export type AnnouncementChannelSelection = {
  sendInApp: boolean;
  sendWhatsApp: boolean;
  sendPush: boolean;
  sendEmail: boolean;
};

/**
 * Um comunicado sem canal não chega a ninguém: bloqueie o envio antes do
 * clique em vez de devolver um erro no servidor.
 */
export function hasAnyAnnouncementChannel(
  selection?: Partial<AnnouncementChannelSelection> | null,
): boolean {
  if (!selection) return false;

  return Boolean(
    selection.sendInApp ||
      selection.sendWhatsApp ||
      selection.sendPush ||
      selection.sendEmail,
  );
}
