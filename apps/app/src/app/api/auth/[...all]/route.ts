import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

const handler = toNextJsHandler(auth);

const SENSITIVE_CREDENTIAL_PATHS = [
  "/api/auth/passkey",
  "/api/auth/change-password",
  "/api/auth/set-password",
  "/api/auth/change-email",
  "/api/auth/delete-user",
  "/api/auth/link-social",
  "/api/auth/unlink-account",
  "/api/auth/update-user",
  "/api/auth/two-factor",
];

function isAdminApiRequest(pathname: string) {
  return pathname.startsWith("/api/auth/admin");
}

function isSensitiveCredentialRequest(pathname: string) {
  return SENSITIVE_CREDENTIAL_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function isImpersonated(request: Request): Promise<boolean> {
  try {
    // Nunca confiar em `impersonatedBy` vindos do cookieCache: mutações de
    // credenciais precisam refletir a sessão real do banco.
    const session = await auth.api.getSession({
      headers: request.headers,
      query: { disableCookieCache: true },
    });
    return Boolean(session?.session.impersonatedBy);
  } catch {
    // Fail-closed: sem sessão confiável, não liberamos mutações de credenciais.
    return true;
  }
}

export async function GET(request: Request) {
  const pathname = new URL(request.url).pathname;
  if (isAdminApiRequest(pathname)) {
    return new Response("Not found", { status: 404 });
  }
  if (isSensitiveCredentialRequest(pathname) && (await isImpersonated(request))) {
    return new Response("Forbidden", { status: 403 });
  }

  return handler.GET(request);
}

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname;
  if (isAdminApiRequest(pathname)) {
    return new Response("Not found", { status: 404 });
  }
  if (isSensitiveCredentialRequest(pathname) && (await isImpersonated(request))) {
    return new Response("Forbidden", { status: 403 });
  }

  return handler.POST(request);
}
