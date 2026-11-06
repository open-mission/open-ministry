import { getAppBaseUrl } from "@/lib/app-url";

export async function getRequestOrigin(requestHeaders: Headers): Promise<string> {
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto");

  if (host) {
    const protocol =
      forwardedProto ?? (host.startsWith("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return getAppBaseUrl();
}
