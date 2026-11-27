import { passkeyClient } from "@better-auth/passkey/client";
import {
  adminClient,
  jwtClient,
  lastLoginMethodClient,
  multiSessionClient,
  organizationClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { sentinelClient } from "@better-auth/infra/client";

import { resolveClientIdentifyUrl } from "@/lib/better-auth-infra";
import {
  platformAc,
  platformRoles,
} from "@/lib/platform/access-control";

// O plugin só é registrado quando o endpoint do Sentinel/identify está
// configurado; sem ele, requisições de identify seriam feitas sem destino.
// Os acessos a process.env precisam ser literais para o inline do Next.
const sentinelIdentifyUrl = resolveClientIdentifyUrl({
  NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL,
  BETTER_AUTH_IDENTIFY_URL: process.env.BETTER_AUTH_IDENTIFY_URL,
  NEXT_PUBLIC_BETTER_AUTH_KV_URL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_KV_URL,
  BETTER_AUTH_KV_URL: process.env.BETTER_AUTH_KV_URL,
});

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    adminClient({ ac: platformAc, roles: platformRoles }),
    usernameClient(),
    passkeyClient(),
    multiSessionClient(),
    lastLoginMethodClient(),
    jwtClient(),
    ...(sentinelIdentifyUrl
      ? [sentinelClient({ identifyUrl: sentinelIdentifyUrl })]
      : []),
  ],
});
