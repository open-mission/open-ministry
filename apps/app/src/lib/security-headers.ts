/**
 * Headers de segurança (achado 7): CSP + cabecalhos clássicos para todas as
 * rotas, montados no next.config.ts.
 *
 * CSP pragmática para Next.js App Router sem middleware de nonce:
 * - 'unsafe-inline' em script é necessário para os scripts de bootstrap do
 *   Next (self.__next_f). O upgrade para nonce + 'strict-dynamic' exige
 *   middleware por request — deixar documentado como passo futuro.
 * - 'unsafe-eval' apenas em desenvolvimento (HMR do Turbopack).
 * - img-src inclui https: por causa das imagens externas dos e-mails no
 *   preview sandboxado (iframe srcDoc herda a CSP da página).
 * - connect-src inclui o origin do realtime Neon (WebSocket externo) quando
 *   configurado; ws/wss same-origin já cobertos por 'self' nos browsers
 *   atuais.
 * - connect-src também inclui o origin do Better Auth Sentinel/KV (identify)
 *   quando configurado; http só é aceito fora de produção.
 * - connect-src inclui os domínios do UploadThing (ingest, CDN e ufs.sh) porque
 *   o upload é feito direto do navegador (HEAD/PUT no ingest e leitura do CDN);
 *   sem eles o browser bloqueia a requisição e o upload falha com FetchError.
 *   Não usamos 'https:' genérico aqui: apenas os hosts necessários.
 */
export type SecurityHeader = { key: string; value: string };

/**
 * Hosts do UploadThing usados pelo upload direto do navegador:
 * - `*.ingest.uploadthing.com`: HEAD/PUT do arquivo no ingest.
 * - `*.uploadthing.com`: endpoints de callback/roteamento do serviço.
 * - `*.ufs.sh` e `utfs.io`: entrega dos arquivos após o upload.
 */
export const UPLOADTHING_CONNECT_SOURCES = [
  "https://*.ingest.uploadthing.com",
  "https://*.uploadthing.com",
  "https://*.ufs.sh",
  "https://utfs.io",
] as const;

type BuildOptions = {
  nodeEnv: string;
  realtimeUrl?: string | null;
  sentinelUrl?: string | null;
};

/**
 * Extrai um origin seguro para a CSP. Aceita `https:` sempre e `http:` apenas
 * fora de produção (ex.: KV local em desenvolvimento).
 */
function extractSecureOrigin(
  value: string | null | undefined,
  nodeEnv: string,
): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.origin;
    if (nodeEnv !== "production" && url.protocol === "http:") {
      return url.origin;
    }
  } catch {
    return null;
  }

  return null;
}

function buildCsp(options: BuildOptions): string {
  const connectSources: string[] = [
    "'self'",
    ...UPLOADTHING_CONNECT_SOURCES,
  ];

  if (options.realtimeUrl) connectSources.push(options.realtimeUrl);
  if (options.sentinelUrl) connectSources.push(options.sentinelUrl);

  const uniqueConnectSources = Array.from(new Set(connectSources));

  const directives: string[] = [
    "default-src 'self'",
    // Next.js injeta scripts inline de bootstrap no App Router; sem middleware
    // de nonce, 'unsafe-inline' é necessário para a hidratação.
    `script-src 'self' 'unsafe-inline'${
      options.nodeEnv === "development" ? " 'unsafe-eval'" : ""
    }`,
    // Tailwind e estilos inline do Next.
    "style-src 'self' 'unsafe-inline'",
    // data: para logos/base64 embutidos; blob: para previews gerados;
    // https: para imagens externas dentro do preview de e-mails.
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src ${uniqueConnectSources.join(" ")}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  return directives.join("; ");
}

export function buildSecurityHeaders(options: BuildOptions): SecurityHeader[] {
  let realtimeOrigin: string | null = null;

  if (options.realtimeUrl) {
    try {
      const url = new URL(options.realtimeUrl);
      if (url.protocol === "wss:" || url.protocol === "https:") {
        realtimeOrigin = url.origin;
      }
    } catch {
      realtimeOrigin = null;
    }
  }

  const sentinelOrigin = extractSecureOrigin(options.sentinelUrl, options.nodeEnv);

  const csp = buildCsp({
    nodeEnv: options.nodeEnv,
    realtimeUrl: realtimeOrigin ?? undefined,
    sentinelUrl: sentinelOrigin ?? undefined,
  });

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()",
    },
    // Atrás de TLS (Vercel/produção); ignorado em http local.
    { key: "Strict-Transport-Security", value: "max-age=15552000" },
  ];
}
