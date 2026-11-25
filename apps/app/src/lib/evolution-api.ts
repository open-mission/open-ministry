import { lookup } from "node:dns/promises";
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
      redirect: "error",
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
      redirect: "error",
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
        redirect: "error",
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
      redirect: "error",
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
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });

    if (goRes.ok) {
      const data = await goRes.json().catch(() => ({}));
      const messageId =
        data?.id ||
        data?.data?.id ||
        data?.key?.id ||
        data?.data?.key?.id ||
        data?.messageId ||
        undefined;
      return {
        ok: true,
        messageId,
      };
    }

    // If 404 or 405, this might be Evolution API Node.js, so continue to fallback.
    // Otherwise, if Evolution Go returned an actual error (e.g. 400 or 500), return it.
    if (goRes.status !== 404 && goRes.status !== 405) {
      const errJson = await goRes.json().catch(() => null);
      console.error("Evolution Go recusou envio", {
        status: goRes.status,
        upstream: errJson?.error ?? errJson?.message ?? null,
      });
      return {
        ok: false,
        error: `Falha no envio via Evolution (HTTP ${goRes.status}).`,
      };
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
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });

    if (nodeRes.ok) {
      const data = await nodeRes.json().catch(() => ({}));
      const messageId =
        data?.key?.id ||
        data?.id ||
        data?.data?.key?.id ||
        data?.data?.id ||
        undefined;
      return {
        ok: true,
        messageId,
      };
    }

    const errorText = await nodeRes.text().catch(() => "");
    console.error("Evolution Node recusou envio", {
      status: nodeRes.status,
      upstream: errorText.slice(0, 500),
    });
    return {
      ok: false,
      error: `Falha no envio via WhatsApp (HTTP ${nodeRes.status}).`,
    };
  } catch (error) {
    console.error("Erro ao enviar mensagem via WhatsApp", error);
    return {
      ok: false,
      error: "Não foi possível enviar a mensagem. Tente novamente.",
    };
  }
}

const BLOCKED_HOSTNAMES = /^(localhost|.*\.localhost|.*\.local|.*\.internal)$/i;

function isBlockedIpAddress(address: string): boolean {
  const hostname = address.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "::1" || hostname === "0.0.0.0" || hostname === "::") return true;
  if (hostname.startsWith("::ffff:")) {
    return isBlockedIpAddress(hostname.slice(7));
  }
  if (/^fe[89ab][0-9a-f]:/i.test(hostname) || hostname.startsWith("fe80:")) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(hostname)) return true;

  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

/**
 * Validação de URL da Evolution: credenciais na URL proibidas, hosts internos e
 * faixas IP privadas/loopback/metadata bloqueadas, e HTTPS obrigatório em produção.
 */
export function parseEvolutionApiUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || url.username || url.password) return null;
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;

    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (BLOCKED_HOSTNAMES.test(hostname) || isBlockedIpAddress(hostname)) return null;

    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/** Em produção, bloqueia também domínios que resolvem para IPs internos (DNS rebinding). */
export async function assertEvolutionUrlResolvedSafe(url: string | URL): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  try {
    const hostname = new URL(url).hostname;
    const addresses = await lookup(hostname, { all: true });
    return !addresses.some((address) => isBlockedIpAddress(address.address));
  } catch {
    return false;
  }
}

function lifecycleError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "Tempo esgotado ao contatar o servidor Evolution.";
  }
  return fallback;
}

function readToken(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export type EvolutionHealthResult = {
  ok: boolean;
  latencyMs: number | null;
  instanceCount: number;
  status: string;
  error?: string;
};

/** checa saúde do servidor Evolution Go e conta instâncias. */
export async function checkEvolutionPlatformHealth({
  apiUrl,
  globalApiKey,
}: {
  apiUrl: string;
  globalApiKey: string;
}): Promise<EvolutionHealthResult> {
  const baseUrl = parseEvolutionApiUrl(apiUrl);
  if (!baseUrl || !globalApiKey.trim()) {
    return {
      ok: false,
      latencyMs: null,
      instanceCount: 0,
      status: "invalid_config",
      error: "URL da API ou chave global inválida.",
    };
  }
  if (!(await assertEvolutionUrlResolvedSafe(new URL(baseUrl)))) {
    return {
      ok: false,
      latencyMs: null,
      instanceCount: 0,
      status: "blocked_host",
      error: "Host da API não permitido.",
    };
  }

  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/instance/all`, {
      method: "GET",
      headers: { apikey: globalApiKey.trim() },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const latencyMs = Date.now() - started;

    if (!response.ok) {
      return {
        ok: false,
        latencyMs,
        instanceCount: 0,
        status: `http_${response.status}`,
        error: `Servidor Evolution respondeu HTTP ${response.status}.`,
      };
    }

    const body = await response.json().catch(() => null);
    const list = Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body)
        ? body
        : [];
    return {
      ok: true,
      latencyMs,
      instanceCount: list.length,
      status: "healthy",
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      instanceCount: 0,
      status: "unreachable",
      error: lifecycleError(error, "Não foi possível contatar o servidor Evolution."),
    };
  }
}

export type EvolutionInstanceResult = {
  ok: boolean;
  instanceToken?: string;
  error?: string;
};

export async function createEvolutionInstance({
  apiUrl,
  globalApiKey,
  instanceName,
  webhookUrl,
}: {
  apiUrl: string;
  globalApiKey: string;
  instanceName: string;
  webhookUrl: string;
}): Promise<EvolutionInstanceResult> {
  const baseUrl = parseEvolutionApiUrl(apiUrl);
  const name = instanceName.trim();
  if (!baseUrl || !globalApiKey.trim() || !name) {
    return { ok: false, error: "Configuração da Evolution incompleta." };
  }

  try {
    const response = await fetch(`${baseUrl}/instance/create`, {
      method: "POST",
      headers: {
        apikey: globalApiKey.trim(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instanceName: name,
        webhookUrl,
        webhook: webhookUrl,
        qrcode: true,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Falha ao criar instância na Evolution (HTTP ${response.status}).`,
      };
    }

    const body = await response.json().catch(() => null);
    return {
      ok: true,
      instanceToken:
        readToken(body?.token) ??
        readToken(body?.data?.token) ??
        readToken(body?.instance?.token) ??
        undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error: lifecycleError(error, "Erro ao criar instância na Evolution."),
    };
  }
}

export type EvolutionConnectResult = {
  ok: boolean;
  qrCode?: string;
  pairingCode?: string;
  error?: string;
};

export async function connectEvolutionInstance({
  apiUrl,
  globalApiKey,
  instanceToken,
  instanceName,
  webhookUrl,
}: {
  apiUrl: string;
  globalApiKey: string;
  instanceToken: string;
  instanceName: string;
  webhookUrl: string;
}): Promise<EvolutionConnectResult> {
  const baseUrl = parseEvolutionApiUrl(apiUrl);
  if (!baseUrl || !instanceName.trim()) {
    return { ok: false, error: "Instância inválida." };
  }
  const token = instanceToken.trim() || globalApiKey.trim();
  if (!token) return { ok: false, error: "Token da instância ausente." };

  try {
    const response = await fetch(`${baseUrl}/instance/connect`, {
      method: "POST",
      headers: {
        apikey: token,
        "Content-Type": "application/json",
        instanceId: instanceName.trim(),
      },
      body: JSON.stringify({ webhookUrl }),
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Falha ao gerar QR Code (HTTP ${response.status}).`,
      };
    }

    const body = await response.json().catch(() => null);
    const qrCode =
      readToken(body?.base64) ??
      readToken(body?.qrcode) ??
      readToken(body?.data?.base64) ??
      readToken(body?.data?.qrcode) ??
      undefined;
    const pairingCode =
      readToken(body?.pairingCode) ?? readToken(body?.code) ?? undefined;

    if (!qrCode && !pairingCode) {
      return { ok: false, error: "A Evolution não retornou QR Code nem código de pareamento." };
    }

    return { ok: true, qrCode, pairingCode };
  } catch (error) {
    return {
      ok: false,
      error: lifecycleError(error, "Erro ao conectar a instância."),
    };
  }
}

export type EvolutionStatusResult = {
  ok: boolean;
  connected: boolean;
  state: string;
  phone?: string;
  profileName?: string;
  error?: string;
};

export async function getEvolutionInstanceStatus({
  apiUrl,
  globalApiKey,
  instanceToken,
  instanceName,
}: {
  apiUrl: string;
  globalApiKey: string;
  instanceToken: string;
  instanceName: string;
}): Promise<EvolutionStatusResult> {
  const baseUrl = parseEvolutionApiUrl(apiUrl);
  if (!baseUrl || !instanceName.trim()) {
    return { ok: false, connected: false, state: "invalid", error: "Instância inválida." };
  }
  const token = instanceToken.trim() || globalApiKey.trim();

  try {
    const response = await fetch(`${baseUrl}/instance/status`, {
      method: "GET",
      headers: { apikey: token, instanceId: instanceName.trim() },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return {
        ok: false,
        connected: false,
        state: `http_${response.status}`,
        error: `Falha ao consultar status (HTTP ${response.status}).`,
      };
    }

    const body = await response.json().catch(() => null);
    const data = body?.data ?? body ?? {};
    const state = String(data.state ?? data.ConnectionStatus ?? "unknown");
    const connected =
      data.Connected === true ||
      state.toLowerCase() === "open" ||
      state.toLowerCase() === "connected";

    return {
      ok: true,
      connected,
      state,
      phone: readToken(data.jid ?? data.phone) ?? undefined,
      profileName: readToken(data.name ?? data.profileName) ?? undefined,
    };
  } catch (error) {
    return {
      ok: false,
      connected: false,
      state: "unreachable",
      error: lifecycleError(error, "Não foi possível consultar o status da instância."),
    };
  }
}

export async function disconnectEvolutionInstance({
  apiUrl,
  globalApiKey,
  instanceToken,
  instanceName,
}: {
  apiUrl: string;
  globalApiKey: string;
  instanceToken: string;
  instanceName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = parseEvolutionApiUrl(apiUrl);
  if (!baseUrl || !instanceName.trim()) {
    return { ok: false, error: "Instância inválida." };
  }
  const token = instanceToken.trim() || globalApiKey.trim();
  try {
    const response = await fetch(`${baseUrl}/instance/logout`, {
      method: "POST",
      headers: { apikey: token, "Content-Type": "application/json" },
      body: JSON.stringify({ instanceName: instanceName.trim() }),
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return { ok: false, error: `Falha ao desconectar (HTTP ${response.status}).` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: lifecycleError(error, "Erro ao desconectar instância.") };
  }
}

export async function deleteEvolutionInstance({
  apiUrl,
  globalApiKey,
  instanceToken,
  instanceName,
}: {
  apiUrl: string;
  globalApiKey: string;
  instanceToken: string;
  instanceName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = parseEvolutionApiUrl(apiUrl);
  if (!baseUrl || !instanceName.trim()) {
    return { ok: false, error: "Instância inválida." };
  }
  const token = instanceToken.trim() || globalApiKey.trim();
  try {
    const response = await fetch(
      `${baseUrl}/instance/delete/${encodeURIComponent(instanceName.trim())}`,
      {
        method: "DELETE",
        headers: { apikey: token },
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok && response.status !== 404) {
      return { ok: false, error: `Falha ao excluir instância (HTTP ${response.status}).` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: lifecycleError(error, "Erro ao excluir instância.") };
  }
}

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
