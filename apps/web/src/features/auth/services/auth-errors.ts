import { isAPIError } from "better-auth/api";

const messages: Record<string, string> = {
  INVALID_EMAIL: "Informe um email válido.",
  INVALID_EMAIL_OR_PASSWORD: "Email ou senha incorretos.",
  USER_ALREADY_EXISTS: "Já existe uma conta com este email. Tente entrar.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Já existe uma conta com este email. Tente entrar.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
  PASSWORD_TOO_LONG: "A senha informada é muito longa.",
  SESSION_EXPIRED: "Sua sessão expirou. Entre novamente para continuar.",
  INVALID_PASSWORD: "Senha incorreta.",
  EMAIL_NOT_VERIFIED: "Confirme seu email antes de continuar.",
  YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION:
    "Você não tem permissão para criar uma igreja.",
  ORGANIZATION_ALREADY_EXISTS: "Já existe uma igreja com este nome.",
  ORGANIZATION_SLUG_ALREADY_TAKEN:
    "Este identificador de igreja já está em uso. Tente outro nome.",
  ORGANIZATION_NOT_FOUND: "Igreja não encontrada.",
  USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION:
    "Você não faz parte desta igreja.",
  USER_IS_NOT_A_MEMBER_OF_THIS_ORGANIZATION:
    "Você não faz parte desta igreja.",
  YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION:
    "Você não faz parte desta igreja.",
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION:
    "Você não tem permissão para alterar esta igreja.",
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION:
    "Você não tem permissão para convidar pessoas.",
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION:
    "Esta pessoa já faz parte da igreja.",
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION:
    "Já existe um convite pendente para este email.",
  INVITATION_NOT_FOUND: "Este convite não existe mais ou expirou.",
  YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION:
    "Este convite foi enviado para outro email.",
  YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION:
    "Você não tem permissão para cancelar este convite.",
  INVITATION_LIMIT_REACHED:
    "O limite de convites desta igreja foi atingido.",
  ORGANIZATION_MEMBERSHIP_LIMIT_REACHED:
    "O limite de membros desta igreja foi atingido.",
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE:
    "Você não tem permissão para convidar com este papel.",
  EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION:
    "Confirme seu email antes de aceitar o convite.",
  EMAIL_VERIFICATION_REQUIRED_FOR_INVITATION:
    "Confirme seu email para visualizar este convite.",
};

/**
 * Turns Better Auth errors into short, friendly Portuguese messages while
 * keeping unexpected errors generic so internal details never reach the UI.
 */
export function actionErrorMessage(error: unknown): string {
  if (isAPIError(error)) {
    const code = error.body?.code;

    if (code && messages[code]) {
      return messages[code];
    }

    return "Não foi possível concluir a operação. Tente novamente.";
  }

  console.error(error);
  return "Algo deu errado. Tente novamente em instantes.";
}
