import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, openAPI, organization } from "better-auth/plugins";
import { jwt } from "better-auth/plugins/jwt";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getAppBaseUrl } from "@/lib/app-url";

export const auth = betterAuth({
  appName: "OpenMinistry",
  baseURL: getAppBaseUrl(),
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      birthday: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Quando a pessoa pertence a exatamente uma igreja, restauramos essa
          // igreja como ativa em cada novo login. Com mais de uma, o onboarding
          // permite escolher qual usar.
          const memberships = await db.query.member.findMany({
            where: eq(schema.member.userId, session.userId),
            columns: { organizationId: true },
            limit: 2,
          });

          if (memberships.length !== 1) {
            return;
          }

          return {
            data: {
              ...session,
              activeOrganizationId: memberships[0].organizationId,
            },
          };
        },
      },
    },
  },
  plugins: [
    organization({
      // Convites ficam válidos por 7 dias.
      invitationExpiresIn: 60 * 60 * 24 * 7,
    }),
    admin({
      // A autorização real é feita por igreja nas server actions; os endpoints
      // HTTP do plugin admin ficam bloqueados em /api/auth/admin/*.
      allowImpersonatingAdmins: true,
    }),
    jwt({
      jwt: {
        audience: "openministry",
        expirationTime: "15m",
        definePayload: ({ user, session }) => ({
          email: user.email,
          name: user.name,
          org_id: session.activeOrganizationId ?? null,
        }),
      },
    }),
    openAPI(),
    // nextCookies must always be the last plugin.
    nextCookies(),
  ],
});
