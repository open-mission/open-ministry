export type EvolutionConfig = {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
};

export function cleanEvolutionUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Sanitizes phone numbers to standard E.164 without "+" symbol.
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

export type ResolvedEvolutionInstance = {
  effectiveToken: string;
  connected: boolean;
  name?: string;
  jid?: string;
  authType: "global" | "instance";
};

/**
 * Resolves the effective instance token for Evolution API Go (Evogo).
 * Supports both:
 * 1. User passing the instance token directly (verified via /instance/status)
 * 2. User passing the Global API Key (resolved via /instance/all to find the instance and its token)
 */
export async function resolveEvolutionInstanceToken(
  config: EvolutionConfig,
): Promise<{
  instance?: ResolvedEvolutionInstance;
  error?: string;
}> {
  const baseUrl = cleanEvolutionUrl(config.apiUrl);
  const key = config.apiKey.trim();
  const targetName = config.instanceName.trim().toLowerCase();

  // 1. Check if the provided key is an instance token (/instance/status)
  try {
    const statusRes = await fetch(`${baseUrl}/instance/status`, {
      method: "GET",
      headers: {
        apikey: key,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (statusRes.ok) {
      const data = await statusRes.json().catch(() => null);
      if (data?.data?.Connected !== undefined || data?.message === "success") {
        return {
          instance: {
            effectiveToken: key,
            connected: Boolean(data?.data?.Connected),
            name: data?.data?.Name,
            authType: "instance",
          },
        };
      }
    }
  } catch {
    // Proceed to check global key
  }

  // 2. Check if the provided key is a global key (/instance/all)
  try {
    const allRes = await fetch(`${baseUrl}/instance/all`, {
      method: "GET",
      headers: {
        apikey: key,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (allRes.ok) {
      const data = await allRes.json().catch(() => null);
      const list: {
        id?: string;
        name?: string;
        token?: string;
        connected?: boolean;
        jid?: string;
      }[] = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

      const match = list.find(
        (i) =>
          i.name?.toLowerCase() === targetName ||
          i.id?.toLowerCase() === targetName,
      );

      if (match && match.token) {
        return {
          instance: {
            effectiveToken: match.token,
            connected: Boolean(match.connected),
            name: match.name,
            jid: match.jid,
            authType: "global",
          },
        };
      }

      if (list.length > 0) {
        const availableNames = list
          .map((i) => i.name || i.id)
          .filter(Boolean)
          .join(", ");
        return {
          error: `Instância "${config.instanceName}" não foi encontrada no servidor. Instâncias disponíveis: ${availableNames}.`,
        };
      }
    }
  } catch {
    // Proceed to Node Evolution fallback
  }

  return {};
}

export async function checkEvolutionConnection({
  apiUrl,
  apiKey,
  instanceName,
}: EvolutionConfig): Promise<{
  ok: boolean;
  state?: string;
  error?: string;
  details?: {
    instanceName?: string;
    whatsappName?: string;
    phoneJid?: string;
    authType?: "global" | "instance";
  };
}> {
  if (!apiUrl || !apiKey || !instanceName) {
    return { ok: false, error: "Configurações da Evolution API incompletas." };
  }

  const baseUrl = cleanEvolutionUrl(apiUrl);
  const key = apiKey.trim();
  const trimmedName = instanceName.trim();

  try {
    // 1. Try Evolution API Go
    const evoGo = await resolveEvolutionInstanceToken({
      apiUrl,
      apiKey,
      instanceName,
    });

    if (evoGo.error) {
      return { ok: false, error: evoGo.error };
    }

    if (evoGo.instance) {
      if (evoGo.instance.connected) {
        return {
          ok: true,
          state: "open",
          details: {
            instanceName: trimmedName,
            whatsappName: evoGo.instance.name,
            phoneJid: evoGo.instance.jid,
            authType: evoGo.instance.authType,
          },
        };
      }

      return {
        ok: false,
        state: "disconnected",
        error: `Instância "${trimmedName}" encontrada no Evolution Go, mas não está conectada ao WhatsApp (escaneie o QR Code no painel do Evolution).`,
      };
    }

    // 2. Fallback to Evolution API Node.js endpoints
    const nodeRes = await fetch(
      `${baseUrl}/instance/connectionState/${encodeURIComponent(trimmedName)}`,
      {
        method: "GET",
        headers: {
          apikey: key,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(6000),
      },
    );

    if (nodeRes.ok) {
      const data = await nodeRes.json().catch(() => ({}));
      const state =
        data?.instance?.state ||
        data?.state ||
        (typeof data === "string" ? data : "open");

      const isConnected = state === "open" || state === "connected";
      return {
        ok: isConnected,
        state,
        error: isConnected
          ? undefined
          : `Instância em estado "${state}". Conecte o WhatsApp no painel.`,
      };
    }

    // 3. Fallback: try fetching instances in Node.js Evolution API
    const fetchRes = await fetch(`${baseUrl}/instance/fetchInstances`, {
      method: "GET",
      headers: {
        apikey: key,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (fetchRes.ok) {
      const instances = await fetchRes.json().catch(() => []);
      const list = Array.isArray(instances) ? instances : [];
      const match = list.find(
        (i: { name?: string; instanceName?: string }) =>
          i.name?.toLowerCase() === trimmedName.toLowerCase() ||
          i.instanceName?.toLowerCase() === trimmedName.toLowerCase(),
      );

      if (match) {
        const state = match.connectionStatus || match.status || "open";
        const isConnected = state === "open" || state === "connected";
        return {
          ok: isConnected,
          state,
          error: isConnected
            ? undefined
            : `Instância em estado "${state}". Conecte o WhatsApp no painel.`,
        };
      }

      return {
        ok: false,
        error: `Instância "${trimmedName}" não foi encontrada no servidor Evolution.`,
      };
    }

    return {
      ok: false,
      error: `Não foi possível validar a instância "${trimmedName}". Verifique a URL, a chave de API (Global ou da Instância) e o nome da instância.`,
    };
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

  // 1. Try Evolution API Go (/send/text)
  try {
    let effectiveToken = config.apiKey.trim();
    const resolved = await resolveEvolutionInstanceToken(config);
    if (resolved.instance?.effectiveToken) {
      effectiveToken = resolved.instance.effectiveToken;
    }

    const goRes = await fetch(`${baseUrl}/send/text`, {
      method: "POST",
      headers: {
        apikey: effectiveToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number,
        text: text.trim(),
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (goRes.ok) {
      const data = await goRes.json().catch(() => ({}));
      return {
        ok: true,
        messageId: data?.id || data?.data?.id || undefined,
      };
    }

    // If 404 or 405, this might be Evolution API Node.js, so continue to fallback.
    // Otherwise, if Evolution Go returned an actual error (e.g. 400 or 500), return it.
    if (goRes.status !== 404 && goRes.status !== 405) {
      const errJson = await goRes.json().catch(() => null);
      const errMsg = errJson?.error || errJson?.message;
      if (errMsg) {
        return {
          ok: false,
          error: `Evolution API Go: ${errMsg}`,
        };
      }
    }
  } catch (err) {
    console.warn("Tentativa via Evolution Go falhou, tentando fallback Node:", err);
  }

  // 2. Fallback to Evolution API Node.js (/message/sendText/:instance)
  try {
    const instance = encodeURIComponent(config.instanceName.trim());
    const nodeRes = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        apikey: config.apiKey.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number,
        text: text.trim(),
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (nodeRes.ok) {
      const data = await nodeRes.json().catch(() => ({}));
      return {
        ok: true,
        messageId: data?.key?.id || data?.id || undefined,
      };
    }

    const errorText = await nodeRes.text().catch(() => "");
    return {
      ok: false,
      error: `Falha no envio Evolution API (HTTP ${nodeRes.status}): ${errorText || nodeRes.statusText}`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido ao enviar.";
    return {
      ok: false,
      error: `Erro ao enviar mensagem via WhatsApp: ${message}`,
    };
  }
}
