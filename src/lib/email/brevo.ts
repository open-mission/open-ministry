export type BrevoContact = {
  email: string;
  name?: string;
};

export type SendBrevoEmailParams = {
  to: BrevoContact[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: BrevoContact;
  replyTo?: BrevoContact;
  tags?: string[];
};

export type SendBrevoEmailResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

export function getBrevoApiKey(): string | undefined {
  return process.env.BREVO_API_KEY || process.env.BREVO_API;
}

export function getDefaultSender(): BrevoContact {
  return {
    email:
      process.env.BREVO_SENDER_EMAIL ||
      process.env.EMAIL_FROM ||
      "notificacoes@openministry.app",
    name: process.env.BREVO_SENDER_NAME || "OpenMinistry",
  };
}

/**
 * Envia email transacional através da API v3 do Brevo (antigo Sendinblue).
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 */
export async function sendEmailViaBrevo(
  params: SendBrevoEmailParams,
): Promise<SendBrevoEmailResult> {
  const apiKey = getBrevoApiKey();

  if (!apiKey) {
    const error = "Chave da API Brevo (BREVO_API_KEY) não configurada.";
    console.warn(`[Brevo] ${error}`);
    return { ok: false, error };
  }

  const sender = params.sender ?? getDefaultSender();

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: params.to.map((t) => ({
          email: t.email.trim(),
          name: t.name?.trim() || undefined,
        })),
        subject: params.subject,
        htmlContent: params.htmlContent,
        ...(params.textContent ? { textContent: params.textContent } : {}),
        ...(params.replyTo ? { replyTo: params.replyTo } : {}),
        ...(params.tags && params.tags.length > 0 ? { tags: params.tags } : {}),
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        data?.message ||
        data?.error ||
        `Erro na API Brevo (HTTP ${response.status})`;
      console.error("[Brevo] Falha ao enviar email transacional:", {
        status: response.status,
        data,
      });
      return { ok: false, error: errorMessage };
    }

    return {
      ok: true,
      messageId: (data as { messageId?: string })?.messageId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido de conexão";
    console.error("[Brevo] Exceção de rede ao enviar email:", errorMessage);
    return { ok: false, error: errorMessage };
  }
}
