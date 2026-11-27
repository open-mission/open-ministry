import { betterAuth } from "better-auth";
import type { BetterAuthPlugin } from "better-auth";
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
import { dash, sentinel } from "@better-auth/infra";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { getAppBaseUrl } from "@/lib/app-url";
import { resolveServerKvUrl } from "@/lib/better-auth-infra";
import {
  platformAc,
  platformRoles,
} from "@/lib/platform/access-control";
import { sendTransactionalEmail } from "@/lib/email/service";
import { getRedisClient, isRedisConfigured } from "@/lib/queue";
import {
  createRedisRateLimitStorage,
} from "@/lib/rate-limit-storage";

// Better Auth Infra (Dash + Sentinel). Ambos dependem de API key e URL do KV;
// sem os dois configurados, os plugins não são registrados.
//
// Aceita BETTER_AUTH_IDENTIFY_URL (URL do projeto no Dash, no formato
// `https://kv.better-auth.com/api/v1/projects/<id>`) e deriva a base do KV
// usada pelo servidor (`https://kv.better-auth.com`). Também aceita
// BETTER_AUTH_KV_URL/NEXT_PUBLIC_BETTER_AUTH_KV_URL explicitamente.
const infraApiKey = process.env.BETTER_AUTH_API_KEY?.trim();
const infraKvUrl = resolveServerKvUrl({
  BETTER_AUTH_KV_URL: process.env.BETTER_AUTH_KV_URL,
  NEXT_PUBLIC_BETTER_AUTH_KV_URL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_KV_URL,
  BETTER_AUTH_IDENTIFY_URL: process.env.BETTER_AUTH_IDENTIFY_URL,
  NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_IDENTIFY_URL,
});
const isInfraConfigured = Boolean(infraApiKey && infraKvUrl);

/** Normaliza uma origem aceitando URL completa ou apenas o host. */
function normalizeTrustedOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Origens confiáveis para cookies/callbacks do Better Auth: URL base da app,
 * variáveis de ambiente da Vercel e domínios canônicos do OpenMinistry.
 */
function getTrustedOrigins(): string[] {
  const candidates = [
    getAppBaseUrl(),
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : null,
    "https://app.openministry.online",
    "https://open-ministry.vercel.app",
    "https://openministry-openmission.vercel.app",
    "https://openministry-git-main-openmission.vercel.app",
    process.env.NODE_ENV !== "production" ? "http://localhost:3000" : null,
  ];

  const origins = candidates
    .filter((value): value is string => typeof value === "string")
    .map(normalizeTrustedOrigin)
    .filter((value): value is string => value !== null);

  return Array.from(new Set(origins));
}

export const auth = betterAuth({
  appName: "OpenMinistry",
  baseURL: getAppBaseUrl(),
  trustedOrigins: getTrustedOrigins,
  secret: process.env.BETTER_AUTH_SECRET,
  // Sessão assinada no cookie por 5 min: evita uma ida ao Neon a cada clique.
  // Checagens sensíveis (plataforma, impersonação) leem com
  // `query: { disableCookieCache: true }` para não usar dados stale.
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  rateLimit: {
    // Limites por IP; o better-auth habilita o limiter em produção e deixa
    // desligado em desenvolvimento (default). Janela global: default 10s/100.
    window: 10,
    max: 100,
    customRules: {
      // Credenciais: 10 tentativas por minuto por IP por endpoint.
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-in/username": { window: 60, max: 10 },
      // Envio de e-mail (magic link, reset): 5 por 5 minutos por IP.
      "/sign-in/magic-link": { window: 300, max: 5 },
      "/forget-password": { window: 300, max: 5 },
      "/reset-password": { window: 300, max: 10 },
      // Cadastro: 20 por hora por IP.
      "/sign-up/email": { window: 3600, max: 20 },
    },
    // Contadores no Redis Upstash (compartilhados entre instâncias; o storage
    // "memory" default é efêmero por instância serverless). Quando o Redis
    // não está configurado, fica o default sem customStorage.
    ...(isRedisConfigured()
      ? {
          customStorage: createRedisRateLimitStorage(getRedisClient()),
        }
      : {}),
  },
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
      // Controle de acesso nativo (better-auth@1.7.18). `super_admin` é o dono
      // do SaaS; `admin` continua sendo apenas o papel técnico dos admins de
      // igreja, sem nenhuma permissão de plataforma. Os endpoints HTTP do
      // plugin admin ficam bloqueados em /api/auth/admin/*.
      ac: platformAc,
      roles: platformRoles,
      adminRoles: ["super_admin", "admin"],
      defaultRole: "user",
      // Importante: NÃO configurar `adminUserIds` — ele ignora `adminRoles` e
      // quebra a impersonação de admins de igreja em `impersonateMemberAction`.
    }),
    username(),
    passkey(),
    multiSession({
      maximumSessions: 5,
    }),
    ...(isInfraConfigured
      ? [
          dash({ apiKey: infraApiKey, kvUrl: infraKvUrl }),
          // O `@better-auth/infra` pode resolver uma instância própria de
          // `better-auth`; o cast mantém a inferência dos demais plugins.
          sentinel({
            apiKey: infraApiKey,
            kvUrl: infraKvUrl,
            security: {
              credentialStuffing: {
                enabled: true,
              },
            },
          }) as unknown as BetterAuthPlugin,
        ]
      : []),
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
