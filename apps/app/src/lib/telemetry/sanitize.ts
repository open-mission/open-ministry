/**
 * Sanitização compartilhada de telemetria (Sentry).
 *
 * Este módulo não importa `@sentry/nextjs` de propósito: ele é consumido tanto
 * pelo logger da aplicação quanto pelos arquivos `sentry.*.config.ts`, que são
 * carregados antes do restante do bundle.
 */

/** Chaves cujo nome indica segredo, credencial ou sessão. */
const SENSITIVE_KEYS_REGEX =
  /pass(word|phrase)?|secret|token|api[_-]?key|auth(orization)?|credit[_-]?card|cvv|cookie|session/i;

/**
 * Chaves de PII (dados pessoais). O match é exato para não mascarar
 * identificadores opacos como `userId`, `taskId` ou `organizationId`.
 */
const PII_KEYS_REGEX =
  /^(?:email|target_?email|user_?email|inviter_?email|phone|whatsapp|mobile|cpf|rg|birthday|birth_?date|username|user_?name|full_?name|person_?name|inviter_?name|sender_?name|recipient_?name|notes)$/i;

/** Mensagens conhecidas que só geram ruído no Sentry. */
const NOISY_SENTRY_MESSAGES = [
  "ExperimentalWarning: vm.USE_MAIN_CONTEXT_DEFAULT_LOADER",
  "MaxListenersExceededWarning",
  "NEXT_REDIRECT",
  "NEXT_NOT_FOUND",
  "[Sentinel] Default global identify ingestion",
  "[Sentinel] Global identify ingestion is configured",
  "Identify request failed",
  'has "fill" but is missing "sizes" prop',
  "cache-bypass-in-dev",
  "Compiled in",
  "Compiling /",
] as const;

export type SentryLogAttributes = Record<string, string | number | boolean>;

export type SentryEventLike = {
  message?: string;
  logentry?: { formatted?: string; message?: string };
  exception?: { values?: Array<{ value?: string }> };
  breadcrumbs?: Array<{ message?: string }>;
  user?: {
    id?: string | number;
    email?: string | null;
    username?: string | null;
    name?: string | null;
    ip_address?: string | null;
  } | null;
};

export type SentryLogLike = {
  level: string;
  message: string;
  attributes?: Record<string, unknown>;
};

/**
 * Opções de privacidade aplicadas em todas as configs do Sentry.
 *
 * O SDK v11 substituiu `sendDefaultPii` por `dataCollection`; desativamos as
 * categorias que carregam dados pessoais. `sendDefaultPii` permanece para
 * versões anteriores do SDK que ainda leem essa opção.
 */
export const sentryPrivacyOptions = {
  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    urlQueryParams: false,
    httpBodies: [] as never[],
    databaseQueryData: false,
    stackFrameVariables: false,
    genAI: { inputs: false, outputs: false },
    mcp: { inputs: false, outputs: false },
    graphQL: { document: false, variables: false },
  },
};

/**
 * Indica se a chave carrega segredo/credencial ou PII que deve ser redigida
 * antes de sair da aplicação.
 */
export function isSensitiveOrPiiKey(key: string): boolean {
  return SENSITIVE_KEYS_REGEX.test(key) || PII_KEYS_REGEX.test(key);
}

/**
 * Remove padrões sensíveis de texto livre: parâmetros de SQL, e-mails e
 * tokens Bearer.
 */
export function sanitizeTelemetryText(text: string): string {
  return text
    .replace(/(\bparams:\s*)([^\n]+)/gi, "$1[REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
}

/**
 * Normaliza e sanitiza atributos para Sentry Structured Logs.
 * Sentry Logs aceita apenas string | number | boolean; valores complexos são
 * serializados e chaves sensíveis/PII são redigidas.
 */
export function sanitizeLogAttributes(
  context?: Record<string, unknown>,
): SentryLogAttributes {
  if (!context || typeof context !== "object") return {};

  const sanitized: SentryLogAttributes = {};

  for (const [key, value] of Object.entries(context)) {
    if (value === undefined || value === null) continue;

    if (isSensitiveOrPiiKey(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    if (typeof value === "string") {
      sanitized[key] = sanitizeTelemetryText(value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    } else if (value instanceof Date) {
      sanitized[key] = value.toISOString();
    } else if (value instanceof Error) {
      sanitized[key] = sanitizeTelemetryText(`${value.name}: ${value.message}`);
    } else {
      try {
        sanitized[key] = sanitizeTelemetryText(JSON.stringify(value));
      } catch {
        sanitized[key] = sanitizeTelemetryText(String(value));
      }
    }
  }

  return sanitized;
}

/** Indica se a mensagem é ruído conhecido e não deve ser enviada ao Sentry. */
export function isNoisySentryMessage(message: string): boolean {
  return NOISY_SENTRY_MESSAGES.some((fragment) => message.includes(fragment));
}

/**
 * Sanitiza um evento do Sentry antes do envio:
 * - descarta eventos ruidosos (incluindo NEXT_REDIRECT/NEXT_NOT_FOUND);
 * - redige PII em mensagens, exceções, breadcrumbs e logentry;
 * - mantém apenas o `id` do usuário, sem e-mail/nome/IP.
 */
export function sanitizeSentryEvent<T extends SentryEventLike>(
  event: T,
): T | null {
  const hasNoisyException = event.exception?.values?.some(
    (value) =>
      typeof value.value === "string" && isNoisySentryMessage(value.value),
  );

  if (
    (typeof event.message === "string" &&
      isNoisySentryMessage(event.message)) ||
    hasNoisyException
  ) {
    return null;
  }

  if (typeof event.message === "string") {
    event.message = sanitizeTelemetryText(event.message);
  }

  if (event.logentry) {
    if (typeof event.logentry.formatted === "string") {
      event.logentry.formatted = sanitizeTelemetryText(
        event.logentry.formatted,
      );
    }
    if (typeof event.logentry.message === "string") {
      event.logentry.message = sanitizeTelemetryText(event.logentry.message);
    }
  }

  if (event.exception?.values) {
    for (const value of event.exception.values) {
      if (typeof value.value === "string") {
        value.value = sanitizeTelemetryText(value.value);
      }
    }
  }

  if (event.breadcrumbs) {
    for (const breadcrumb of event.breadcrumbs) {
      if (typeof breadcrumb.message === "string") {
        breadcrumb.message = sanitizeTelemetryText(breadcrumb.message);
      }
    }
  }

  if (event.user) {
    event.user = { id: event.user.id };
  }

  return event;
}

/**
 * Sanitiza um log estruturado antes do envio. Em produção, descarta os níveis
 * trace/debug; mensagens ruidosas são descartadas em qualquer ambiente.
 */
export function sanitizeSentryLog<T extends SentryLogLike>(
  log: T,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): T | null {
  if (
    nodeEnv === "production" &&
    (log.level === "trace" || log.level === "debug")
  ) {
    return null;
  }

  if (typeof log.message === "string" && isNoisySentryMessage(log.message)) {
    return null;
  }

  log.message = sanitizeTelemetryText(log.message);
  log.attributes = sanitizeLogAttributes(log.attributes);

  return log;
}
