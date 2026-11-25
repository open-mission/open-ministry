import { parseEvolutionApiUrl, assertEvolutionUrlResolvedSafe } from "./url-safety";

/** Ciclo de vida da instância e saúde do servidor Evolution Go. */
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
