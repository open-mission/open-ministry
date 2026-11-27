import { cleanEvolutionUrl } from "./url-safety";
import {
  resolveEvolutionInstanceToken,
  type EvolutionConfig,
} from "./messaging";

/** Registro do webhook da instância na Evolution. */
export async function configureEvolutionWebhook({
  config,
  webhookUrl,
}: {
  config: EvolutionConfig;
  webhookUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!config.apiUrl || !config.apiKey || !config.instanceName) {
    return { ok: false, error: "Configurações da Evolution API incompletas." };
  }

  const baseUrl = cleanEvolutionUrl(config.apiUrl);
  let effectiveToken = config.apiKey.trim();
  const trimmedName = config.instanceName.trim();

  try {
    const resolved = await resolveEvolutionInstanceToken(config);
    if (resolved.instance?.effectiveToken) {
      effectiveToken = resolved.instance.effectiveToken;
    }

    const payload = {
      enabled: true,
      url: webhookUrl,
      webhook_by_events: false,
      webhookByEvents: false,
      webhookUrl,
      events: [
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "SEND_MESSAGE",
        "CONNECTION_UPDATE",
      ],
      subscribe: ["ALL"],
      immediate: true,
    };

    // 1. Try /webhook/set/{instanceName}
    try {
      const setRes = await fetch(
        `${baseUrl}/webhook/set/${encodeURIComponent(trimmedName)}`,
        {
          method: "POST",
          headers: {
            apikey: effectiveToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          redirect: "error",
          signal: AbortSignal.timeout(8000),
        },
      );

      if (setRes.ok) {
        return { ok: true };
      }
    } catch {
      // Proceed to fallback
    }

    // 2. Try /instance/connect fallback (for pure Evolution Go instance connect)
    try {
      const connectRes = await fetch(`${baseUrl}/instance/connect`, {
        method: "POST",
        headers: {
          apikey: effectiveToken,
          "Content-Type": "application/json",
          instanceId: trimmedName,
        },
        body: JSON.stringify({
          webhookUrl,
          subscribe: ["ALL"],
          immediate: true,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });

      if (connectRes.ok) {
        return { ok: true };
      }
    } catch {
      // Fallback
    }

    // 3. Try Node.js Evolution endpoint format
    const nodeRes = await fetch(
      `${baseUrl}/webhook/set/${encodeURIComponent(trimmedName)}`,
      {
        method: "POST",
        headers: {
          apikey: config.apiKey.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            base64: false,
            events: [
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "SEND_MESSAGE",
              "CONNECTION_UPDATE",
            ],
          },
        }),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      },
    );

    if (nodeRes.ok) {
      return { ok: true };
    }

    const errText = await nodeRes.text().catch(() => "");
    return {
      ok: false,
      error: `Não foi possível registrar o webhook no servidor Evolution (${nodeRes.status}): ${errText || nodeRes.statusText}`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return {
      ok: false,
      error: `Erro ao conectar com servidor Evolution para registrar webhook: ${msg}`,
    };
  }
}
