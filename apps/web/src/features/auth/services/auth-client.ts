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

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    adminClient(),
    usernameClient(),
    passkeyClient(),
    multiSessionClient(),
    lastLoginMethodClient(),
    jwtClient(),
    sentinelClient(),
  ],
});
