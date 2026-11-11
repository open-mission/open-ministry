import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { passkey } from "@better-auth/passkey";
import {
  admin,
  lastLoginMethod,
  magicLink,
  multiSession,
  openAPI,
  organization,
  username,
} from "better-auth/plugins";
import { jwt } from "better-auth/plugins/jwt";
import { dash } from "@better-auth/infra";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getAppBaseUrl } from "@/lib/app-url";
import { sendTransactionalEmail } from "@/lib/email/service";

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
    sendResetPassword: async ({ user, url }) => {
      await sendTransactionalEmail({
        type: "reset_password",
        to: { email: user.email, name: user.name },
        userId: user.id,
        data: {
          name: user.name,
          resetUrl: url,
          expiresInMinutes: 60,
        },
      }).catch((err) => {
        console.error("Erro ao enviar email de recuperação de senha:", err);
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendTransactionalEmail({
        type: "email_verification",
        to: { email: user.email, name: user.name },
        userId: user.id,
        data: {
          name: user.name,
          verifyUrl: url,
        },
      }).catch((err) => {
        console.error("Erro ao enviar email de verificação:", err);
      });
    },
  },
  user: {
    additionalFields: {
      birthday: {
        type: "string",
        required: false,
        input: true,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      weekStartsOn: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: true,
      },
      timezone: {
        type: "string",
        required: false,
        defaultValue: "America/Sao_Paulo",
        input: true,
      },
      pwaInstalled: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      pwaInstalledAt: {
        type: "date",
        required: false,
        input: false,
      },
      pwaPlatform: {
        type: "string",
        required: false,
        input: false,
      },
      pwaLastSeenAt: {
        type: "date",
        required: false,
        input: false,
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
    user: {
      create: {
        after: async (user) => {
          await sendTransactionalEmail({
            type: "welcome",
            to: { email: user.email, name: user.name },
            userId: user.id,
            data: {
              name: user.name,
              dashboardUrl: `${getAppBaseUrl()}/`,
            },
          }).catch((err) => {
            console.error("Erro ao enviar email de boas-vindas:", err);
          });
        },
      },
    },
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
    username(),
    passkey(),
    multiSession({
      maximumSessions: 5,
    }),
    dash(),
    lastLoginMethod(),
    jwt({
      jwks: {
        disablePrivateKeyEncryption: true,
      },
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
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const existingUser = await db.query.user.findFirst({
          where: eq(schema.user.email, email),
          columns: { id: true, name: true },
        });

        await sendTransactionalEmail({
          type: "magic_link",
          to: { email, name: existingUser?.name || "Membro" },
          userId: existingUser?.id,
          data: {
            name: existingUser?.name || "Membro",
            magicLinkUrl: url,
          },
        }).catch((err) => {
          console.error("Erro ao enviar magic link por email:", err);
        });
      },
    }),
    openAPI(),
    // nextCookies must always be the last plugin.
    nextCookies(),
  ],
});
