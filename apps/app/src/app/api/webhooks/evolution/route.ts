import { NextResponse } from "next/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { authenticateEvolutionWebhook } from "@/lib/evolution-webhook";
import { formatPhoneNumberForEvolution } from "@/lib/evolution-api";
import {
  checkRateLimit,
  extractClientIp,
  rateLimitHeaders,
  RATE_LIMIT_RULES,
} from "@/lib/rate-limit";
import { sentryLogger } from "@/lib/telemetry/sentry";

type EvolutionUpdateItem = {
  key?: {
    id?: string;
    remoteJid?: string;
    fromMe?: boolean;
  };
  update?: {
    status?: string | number;
  };
  status?: string | number;
};

type EvolutionUpsertItem = {
  key?: {
    id?: string;
    remoteJid?: string;
    fromMe?: boolean;
  };
  status?: string | number;
  messageTimestamp?: number;
};

type EvolutionStatus = "sent" | "delivered" | "read";

function buildStatusUpdateFields(status: EvolutionStatus): Record<string, unknown> {
  const updateFields: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (status === "sent") {
    updateFields.sentAt = sql`COALESCE(${schema.whatsappMessageLog.sentAt}, NOW())`;
  } else if (status === "delivered") {
    updateFields.deliveredAt = sql`COALESCE(${schema.whatsappMessageLog.deliveredAt}, NOW())`;
    updateFields.sentAt = sql`COALESCE(${schema.whatsappMessageLog.sentAt}, NOW())`;
  } else {
    updateFields.readAt = sql`COALESCE(${schema.whatsappMessageLog.readAt}, NOW())`;
    updateFields.deliveredAt = sql`COALESCE(${schema.whatsappMessageLog.deliveredAt}, NOW())`;
    updateFields.sentAt = sql`COALESCE(${schema.whatsappMessageLog.sentAt}, NOW())`;
  }

  return updateFields;
}

export async function POST(req: Request) {
  let instanceName = "";
  try {
    // Antes de qualquer leitura no banco: limita flood por IP do remetente.
    const decision = await checkRateLimit(
      `evolution-webhook:${extractClientIp(req.headers)}`,
      RATE_LIMIT_RULES.evolutionWebhook,
    );
    if (!decision.allowed) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente em instantes." },
        { status: 429, headers: rateLimitHeaders(decision) },
      );
    }

    const url = new URL(req.url);
    // Header dedicado primeiro: a query string mantém-se apenas como fallback
    // de compatibilidade com a Evolution Go, sem logar o token em nenhum ponto.
    const authorization = req.headers.get("authorization")?.trim();
    const bearer = authorization
      ? /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim()
      : undefined;
    const webhookToken =
      req.headers.get("x-webhook-token")?.trim() ||
      bearer ||
      url.searchParams.get("token")?.trim();

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { error: "Payload JSON inválido" },
        { status: 400 },
      );
    }

    const eventRaw = String(rawBody.event || rawBody.type || "").toLowerCase().replace(/_/g, ".");
    instanceName = String(rawBody.instance || "").trim();
    const rawData = rawBody.data;

    sentryLogger.setScopeContext({
      route: "/api/webhooks/evolution",
      event: eventRaw,
      instanceName,
    });

    // 1. Identify organization (falhe fechado: em produção, um token válido é
    // obrigatório; o token identifica a organização e autentica o webhook).
    const organizationId = await authenticateEvolutionWebhook(
      webhookToken,
      async (candidate) => {
        const channel = await db.query.organizationNotificationChannel.findFirst({
          where: eq(
            schema.organizationNotificationChannel.webhookSecret,
            candidate,
          ),
          columns: {
            id: true,
            organizationId: true,
            webhookSecret: true,
            instanceName: true,
          },
        });
        return channel ?? null;
      },
      process.env.NODE_ENV ?? "development",
    );

    if (!organizationId.ok) {
      return NextResponse.json(
        { error: "Token de webhook inválido" },
        { status: 401 },
      );
    }

    const orgScopeId = organizationId.organizationId;

    // 1.1 Sincroniza o estado da instância gerenciada pela plataforma.
    if (eventRaw.includes("connection")) {
      // Um webhook autenticado só pode alterar o canal da própria instância.
      if (!instanceName) {
        return NextResponse.json(
          { error: "Instância não informada" },
          { status: 400 },
        );
      }
      if (
        organizationId.instanceName &&
        organizationId.instanceName !== instanceName
      ) {
        return NextResponse.json(
          { error: "Instância não corresponde ao canal autenticado" },
          { status: 400 },
        );
      }

      const connectionData = Array.isArray(rawData) ? rawData[0] : rawData;
      const state = String(
        connectionData?.state ?? connectionData?.status ?? "",
      ).toLowerCase();
      const connected = state === "open" || state === "connected";
      const rawPhone =
        connectionData?.jid ??
        connectionData?.phone ??
        connectionData?.connectedPhone ??
        "";
      const phone = String(rawPhone).split("@")[0] || null;
      const profileName =
        connectionData?.profileName ?? connectionData?.name ?? null;
      const errorMessage = connected
        ? null
        : connectionData?.error
          ? String(connectionData.error).slice(0, 500)
          : null;

      if (orgScopeId) {
        await db
          .update(schema.organizationNotificationChannel)
          .set({
            connectionStatus: connected ? "connected" : state || "disconnected",
            connectedPhone: connected ? phone : null,
            connectedProfileName:
              connected && profileName ? String(profileName) : null,
            lastConnectedAt: connected ? new Date() : undefined,
            lastError: errorMessage,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(
                schema.organizationNotificationChannel.organizationId,
                orgScopeId,
              ),
              eq(
                schema.organizationNotificationChannel.channel,
                "evolution_whatsapp",
              ),
              eq(
                schema.organizationNotificationChannel.instanceName,
                instanceName,
              ),
              organizationId.channelId && schema.organizationNotificationChannel.id
                ? eq(
                    schema.organizationNotificationChannel.id,
                    organizationId.channelId,
                  )
                : undefined,
            ),
          );
      }
    }

    // 2. Handle Status Updates (messages.update / message.update / etc.)
    if (eventRaw.includes("update")) {
      const items: EvolutionUpdateItem[] = Array.isArray(rawData)
        ? rawData
        : rawData
          ? [rawData]
          : [];

      const groupedUpdates = new Map<EvolutionStatus, string[]>();
      const phoneFallbacks: Array<{
        messageId?: string;
        cleanPhone: string | null;
        status: EvolutionStatus;
      }> = [];

      for (const item of items) {
        const messageId = item.key?.id;
        const statusValue = String(item.update?.status ?? item.status ?? "").toUpperCase();
        const rawJid = item.key?.remoteJid || "";
        const cleanPhone = rawJid.split("@")[0]
          ? formatPhoneNumberForEvolution(rawJid.split("@")[0])
          : null;

        if (!statusValue) continue;

        let mappedStatus: EvolutionStatus | null = null;
        if (statusValue === "SERVER_ACK" || statusValue === "2" || statusValue === "SENT") {
          mappedStatus = "sent";
        } else if (
          statusValue === "DELIVERY_ACK" ||
          statusValue === "3" ||
          statusValue === "DELIVERED" ||
          statusValue === "RECEIVED"
        ) {
          mappedStatus = "delivered";
        } else if (
          statusValue === "READ" ||
          statusValue === "PLAYED" ||
          statusValue === "4"
        ) {
          mappedStatus = "read";
        }

        if (!mappedStatus) continue;

        // Agrupa por status: um UPDATE por status com inArray, em vez de um
        // UPDATE por mensagem dentro do loop.
        if (messageId) {
          const ids = groupedUpdates.get(mappedStatus) ?? [];
          ids.push(messageId);
          groupedUpdates.set(mappedStatus, ids);
        }
        phoneFallbacks.push({ messageId, cleanPhone, status: mappedStatus });
      }

      const allMessageIds = [...new Set([...groupedUpdates.values()].flat())];
      const matchedIds = new Set<string>();

      if (allMessageIds.length > 0) {
        const matched = await db
          .select({ evolutionMessageId: schema.whatsappMessageLog.evolutionMessageId })
          .from(schema.whatsappMessageLog)
          .where(
            and(
              inArray(schema.whatsappMessageLog.evolutionMessageId, allMessageIds),
              orgScopeId
                ? eq(schema.whatsappMessageLog.organizationId, orgScopeId)
                : undefined,
            ),
          );

        for (const row of matched) {
          if (row.evolutionMessageId) matchedIds.add(row.evolutionMessageId);
        }
      }

      for (const [status, ids] of groupedUpdates) {
        await db
          .update(schema.whatsappMessageLog)
          .set(buildStatusUpdateFields(status))
          .where(
            and(
              inArray(schema.whatsappMessageLog.evolutionMessageId, ids),
              orgScopeId
                ? eq(schema.whatsappMessageLog.organizationId, orgScopeId)
                : undefined,
            ),
          );
      }

      // Fallback por telefone apenas para mensagens que não foram encontradas
      // pelo ID (nunca cruza organizações).
      for (const candidate of phoneFallbacks) {
        if (candidate.messageId && matchedIds.has(candidate.messageId)) continue;
        if (!candidate.cleanPhone || !orgScopeId) continue;

        const recentLog = await db.query.whatsappMessageLog.findFirst({
          where: and(
            eq(schema.whatsappMessageLog.organizationId, orgScopeId),
            eq(schema.whatsappMessageLog.recipientPhone, candidate.cleanPhone),
            inArray(schema.whatsappMessageLog.status, ["pending", "sending", "sent", "delivered"]),
          ),
          orderBy: [desc(schema.whatsappMessageLog.createdAt)],
        });

        if (!recentLog) continue;

        const updateFields = buildStatusUpdateFields(candidate.status);
        if (candidate.messageId && !recentLog.evolutionMessageId) {
          updateFields.evolutionMessageId = candidate.messageId;
        }
        await db
          .update(schema.whatsappMessageLog)
          .set(updateFields)
          .where(eq(schema.whatsappMessageLog.id, recentLog.id));
      }
    }

    // 3. Handle Message Upsert / Send Message (messages.upsert / send.message)
    if (eventRaw.includes("upsert") || eventRaw.includes("send")) {
      const items: EvolutionUpsertItem[] = Array.isArray(rawData)
        ? rawData
        : rawData
          ? [rawData]
          : [];

      const outboundIds: string[] = [];
      const phoneFallbacks: string[] = [];

      for (const item of items) {
        // We only care about outbound messages sent from this instance
        if (item.key?.fromMe !== true) continue;

        const messageId = item.key?.id;
        const rawJid = item.key?.remoteJid || "";
        const cleanPhone = rawJid.split("@")[0]
          ? formatPhoneNumberForEvolution(rawJid.split("@")[0])
          : null;

        if (messageId) {
          outboundIds.push(messageId);
        } else if (cleanPhone && orgScopeId) {
          phoneFallbacks.push(cleanPhone);
        }
      }

      if (outboundIds.length > 0) {
        await db
          .update(schema.whatsappMessageLog)
          .set({
            status: "sent",
            sentAt: sql`COALESCE(${schema.whatsappMessageLog.sentAt}, NOW())`,
            lastError: null,
          })
          .where(
            and(
              inArray(
                schema.whatsappMessageLog.evolutionMessageId,
                [...new Set(outboundIds)],
              ),
              inArray(schema.whatsappMessageLog.status, ["pending", "sending"]),
              orgScopeId
                ? eq(schema.whatsappMessageLog.organizationId, orgScopeId)
                : undefined,
            ),
          );
      }

      // Sem ID, mark the most recent pending log for that phone as sent. O
      // ramo antigo exigia `messageId` aqui, mas ele é sempre falsy neste else.
      for (const cleanPhone of phoneFallbacks) {
        const pending = await db.query.whatsappMessageLog.findFirst({
          where: and(
            eq(schema.whatsappMessageLog.organizationId, orgScopeId!),
            eq(schema.whatsappMessageLog.recipientPhone, cleanPhone),
            inArray(schema.whatsappMessageLog.status, ["pending", "sending"]),
          ),
          orderBy: [desc(schema.whatsappMessageLog.createdAt)],
        });

        if (pending) {
          await db
            .update(schema.whatsappMessageLog)
            .set({
              status: "sent",
              sentAt: new Date(),
              lastError: null,
            })
            .where(eq(schema.whatsappMessageLog.id, pending.id));
        }
      }
    }

    sentryLogger.info(
      sentryLogger.fmt`Evolution webhook event processed: ${eventRaw}`,
      {
        instanceName,
        organizationId: orgScopeId ?? "unknown",
        event: eventRaw,
      },
    );

    return NextResponse.json({
      received: true,
      event: eventRaw,
    });
  } catch (error) {
    sentryLogger.error(error instanceof Error ? error : String(error), {
      route: "/api/webhooks/evolution",
      instanceName,
    });
    console.error("Erro ao processar webhook da Evolution API:", error);
    // Respond 200 with error flag so Evolution doesn't enter retry loops
    return NextResponse.json(
      { received: true, error: "Internal processing error" },
      { status: 200 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "OpenMinistry Evolution Go Webhook Endpoint",
    timestamp: new Date().toISOString(),
  });
}
