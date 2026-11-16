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

// O plugin só é registrado quando o endpoint do Sentinel/identify está
// configurado; sem ele, requisições de identify seriam feitas sem destino.
const sentinelIdentifyUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_KV_URL?.trim();

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    adminClient(),
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
