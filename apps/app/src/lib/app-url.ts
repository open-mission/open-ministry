/**
 * Resolves the public URL of the current deployment.
 *
 * - Local development: `BETTER_AUTH_URL` (http://localhost:3000).
 * - Vercel Production: `BETTER_AUTH_URL` (the canonical alias).
 * - Vercel Preview: the deployment URL, so Better Auth and the tenant JWKS
 *   verification use the same host/branch database as the preview app.
 */
export function getAppBaseUrl(): string {
  const vercelUrl = process.env.VERCEL_URL;

  if (process.env.VERCEL_ENV === "preview" && vercelUrl) {
    return `https://${vercelUrl}`;
  }

  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL.replace(/\/$/, "");
  }

  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}
