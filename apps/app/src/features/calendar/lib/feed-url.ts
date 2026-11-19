const DEFAULT_BASE_URL = "http://localhost:3000";

export function resolveAppBaseUrl(): string {
  const base =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    DEFAULT_BASE_URL;

  return base.replace(/\/+$/, "");
}

export type CalendarFeedUrls = {
  /** URL https, usada por Google Calendar e Outlook ("Adicionar por URL"). */
  url: string;
  /** URL webcal://, que abre a assinatura direto no Apple Calendar. */
  webcalUrl: string;
};

/**
 * Os links apontam para a rota pública: quem busca é o app de calendário do
 * membro, sem sessão e sem cookie.
 */
export function buildCalendarFeedUrls(
  rawToken: string,
  baseUrl: string = resolveAppBaseUrl(),
): CalendarFeedUrls {
  const path = `/api/calendar/feed/${rawToken}`;
  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  const host = url.replace(/^https?:\/\//, "");

  return { url, webcalUrl: `webcal://${host}` };
}
