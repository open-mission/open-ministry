export type EvolutionConfig = {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
};

export function cleanEvolutionUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Sanitizes phone numbers to standard E.164 without "+" symbol (standard Evolution format).
 * E.g. "+55 (11) 99999-8888" -> "5511999998888"
 * "11 98888-7777" -> "5511988887777" (adds 55 if length is 10 or 11)
 */
export function formatPhoneNumberForEvolution(rawPhone: string): string | null {
  if (!rawPhone) return null;
  let digits = rawPhone.replace(/\D/g, "");

  // Remove leading 0 if present (e.g. 011999998888)
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // If 10 or 11 digits (Brazilian DDD + number), prepend Brazil country code 55
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  // Minimum length check (country code + area + number is at least 10 digits)
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

export async function checkEvolutionConnection({
  apiUrl,
  apiKey,
  instanceName,
}: EvolutionConfig): Promise<{
  ok: boolean;
  state?: string;
  error?: string;
}> {
  if (!apiUrl || !apiKey || !instanceName) {
    return { ok: false, error: "Configurações da Evolution API incompletas." };
  }

  const baseUrl = cleanEvolutionUrl(apiUrl);

  try {
    const res = await fetch(
      `${baseUrl}/instance/connectionState/${encodeURIComponent(instanceName.trim())}`,
      {
        method: "GET",
        headers: {
          apikey: apiKey.trim(),
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!res.ok) {
      // Fallback: try fetching instance list
      const fallbackRes = await fetch(`${baseUrl}/instance/fetchInstances`, {
        method: "GET",
        headers: {
          apikey: apiKey.trim(),
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!fallbackRes.ok) {
        return {
          ok: false,
          error: `Evolution API retornou status HTTP ${res.status}. Verifique URL e chave de API.`,
        };
      }

      const instances = await fallbackRes.json();
      const targetInstance = Array.isArray(instances)
        ? instances.find(
            (i: { name?: string; instanceName?: string }) =>
              i.name === instanceName || i.instanceName === instanceName,
          )
        : null;

      if (!targetInstance) {
        return {
          ok: false,
          error: `Instância "${instanceName}" não foi encontrada no servidor Evolution.`,
        };
      }

      return {
        ok: true,
        state: targetInstance.connectionStatus || targetInstance.status || "open",
      };
    }

    const data = await res.json();
    const state =
      data?.instance?.state ||
      data?.state ||
      (typeof data === "string" ? data : "connected");

    return { ok: true, state };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido ao conectar.";
    return {
      ok: false,
      error: `Não foi possível conectar ao servidor Evolution: ${message}`,
    };
  }
}

export async function sendEvolutionTextMessage({
  config,
  to,
  text,
}: {
  config: EvolutionConfig;
  to: string;
  text: string;
}): Promise<{
  ok: boolean;
  messageId?: string;
  error?: string;
}> {
  const number = formatPhoneNumberForEvolution(to);
  if (!number) {
    return {
      ok: false,
      error: `Número de telefone "${to}" inválido para envio via WhatsApp.`,
    };
  }

  if (!text || !text.trim()) {
    return { ok: false, error: "Mensagem vazia." };
  }

  const baseUrl = cleanEvolutionUrl(config.apiUrl);
  const instance = encodeURIComponent(config.instanceName.trim());

  try {
    const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        apikey: config.apiKey.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number,
        text: text.trim(),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Falha no envio Evolution API (HTTP ${res.status}): ${errorText || res.statusText}`,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      ok: true,
      messageId: data?.key?.id || data?.id || undefined,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido ao enviar.";
    return {
      ok: false,
      error: `Erro de rede ao enviar mensagem Evolution API: ${message}`,
    };
  }
}
