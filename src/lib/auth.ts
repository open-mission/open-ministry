import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { openAPI, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  appName: "OpenMinistry",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
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
    openAPI(),
    // nextCookies must always be the last plugin.
    nextCookies(),
  ],
});
