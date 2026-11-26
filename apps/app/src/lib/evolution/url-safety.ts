import { lookup } from "node:dns/promises";

/** Normalização de URL compartilhada — não é validação de segurança. */
export function cleanEvolutionUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

const BLOCKED_HOSTNAMES = /^(localhost|.*\.localhost|.*\.local|.*\.internal)$/i;

function isBlockedIpAddress(address: string): boolean {
  const hostname = address.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "::1" || hostname === "0.0.0.0" || hostname === "::") return true;
  // O WHATWG URL normaliza ::ffff:127.0.0.1 para ::ffff:7f00:1, que escapa do
  // parser decimal. Qualquer IPv4-mapped IPv6 é host interno por definição.
  if (hostname.startsWith("::ffff:")) return true;
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
