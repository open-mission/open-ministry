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
 */
export type SecurityHeader = { key: string; value: string };

type BuildOptions = {
  nodeEnv: string;
  realtimeUrl?: string | null;
};

function buildCsp(options: BuildOptions): string {
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
    `connect-src 'self'${
      options.realtimeUrl ? ` ${options.realtimeUrl}` : ""
    }`,
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

  const csp = buildCsp({
    nodeEnv: options.nodeEnv,
    realtimeUrl: realtimeOrigin ?? undefined,
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
