import { NextResponse } from "next/server";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { formatPhoneNumberForEvolution } from "@/lib/evolution-api";

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

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const tokenParam = url.searchParams.get("token")?.trim();
    const orgIdParam = url.searchParams.get("orgId")?.trim();

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json(
        { error: "Payload JSON inválido" },
        { status: 400 },
      );
    }

    const eventRaw = String(rawBody.event || rawBody.type || "").toLowerCase().replace(/_/g, ".");
    const instanceName = String(rawBody.instance || "").trim();
    const rawData = rawBody.data;

    // 1. Identify organization
    let organizationId: string | null = orgIdParam || null;

    if (!organizationId && tokenParam) {
      const channel = await db.query.organizationNotificationChannel.findFirst({
        where: or(
          eq(schema.organizationNotificationChannel.webhookSecret, tokenParam),
          eq(schema.organizationNotificationChannel.apiKey, tokenParam),
        ),
        columns: { organizationId: true },
      });
      if (channel) {
        organizationId = channel.organizationId;
      }
    }

    if (!organizationId && instanceName) {
      const channel = await db.query.organizationNotificationChannel.findFirst({
        where: eq(schema.organizationNotificationChannel.instanceName, instanceName),
        columns: { organizationId: true },
      });
      if (channel) {
        organizationId = channel.organizationId;
      }
    }

    // 2. Handle Status Updates (messages.update / message.update / etc.)
    if (eventRaw.includes("update")) {
      const items: EvolutionUpdateItem[] = Array.isArray(rawData)
        ? rawData
        : rawData
          ? [rawData]
          : [];

      for (const item of items) {
        const messageId = item.key?.id;
        const statusValue = String(item.update?.status ?? item.status ?? "").toUpperCase();
        const rawJid = item.key?.remoteJid || "";
        const cleanPhone = rawJid.split("@")[0]
          ? formatPhoneNumberForEvolution(rawJid.split("@")[0])
          : null;

        if (!statusValue) continue;

        let mappedStatus: "sent" | "delivered" | "read" | null = null;
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

        const updateFields: Record<string, unknown> = {
          status: mappedStatus,
          updatedAt: new Date(),
        };

        if (mappedStatus === "sent") {
          updateFields.sentAt = sql`COALESCE(${schema.whatsappMessageLog.sentAt}, NOW())`;
        } else if (mappedStatus === "delivered") {
          updateFields.deliveredAt = sql`COALESCE(${schema.whatsappMessageLog.deliveredAt}, NOW())`;
          updateFields.sentAt = sql`COALESCE(${schema.whatsappMessageLog.sentAt}, NOW())`;
        } else if (mappedStatus === "read") {
          updateFields.readAt = sql`COALESCE(${schema.whatsappMessageLog.readAt}, NOW())`;
          updateFields.deliveredAt = sql`COALESCE(${schema.whatsappMessageLog.deliveredAt}, NOW())`;
          updateFields.sentAt = sql`COALESCE(${schema.whatsappMessageLog.sentAt}, NOW())`;
        }

        // Try updating by Evolution Message ID first
        if (messageId) {
          const res = await db
            .update(schema.whatsappMessageLog)
            .set(updateFields)
            .where(eq(schema.whatsappMessageLog.evolutionMessageId, messageId));

          if (res.rowCount && res.rowCount > 0) {
            continue;
          }
        }

        // Fallback: match by phone number for recent log in the same organization
        if (cleanPhone) {
          const whereClause = organizationId
            ? and(
                eq(schema.whatsappMessageLog.organizationId, organizationId),
                eq(schema.whatsappMessageLog.recipientPhone, cleanPhone),
                inArray(schema.whatsappMessageLog.status, ["pending", "sending", "sent", "delivered"]),
              )
            : and(
                eq(schema.whatsappMessageLog.recipientPhone, cleanPhone),
                inArray(schema.whatsappMessageLog.status, ["pending", "sending", "sent", "delivered"]),
              );

          const recentLog = await db.query.whatsappMessageLog.findFirst({
            where: whereClause,
            orderBy: [desc(schema.whatsappMessageLog.createdAt)],
          });

          if (recentLog) {
            if (messageId && !recentLog.evolutionMessageId) {
              updateFields.evolutionMessageId = messageId;
            }
            await db
              .update(schema.whatsappMessageLog)
              .set(updateFields)
              .where(eq(schema.whatsappMessageLog.id, recentLog.id));
          }
        }
      }
    }

    // 3. Handle Message Upsert / Send Message (messages.upsert / send.message)
    if (eventRaw.includes("upsert") || eventRaw.includes("send")) {
      const items: EvolutionUpsertItem[] = Array.isArray(rawData)
        ? rawData
        : rawData
          ? [rawData]
          : [];

      for (const item of items) {
        // We only care about outbound messages sent from this instance
        if (item.key?.fromMe !== true) continue;

        const messageId = item.key?.id;
        const rawJid = item.key?.remoteJid || "";
        const cleanPhone = rawJid.split("@")[0]
          ? formatPhoneNumberForEvolution(rawJid.split("@")[0])
          : null;

        if (messageId) {
          // If message already exists by ID, mark it sent
          await db
            .update(schema.whatsappMessageLog)
            .set({
              status: "sent",
              sentAt: sql`COALESCE(${schema.whatsappMessageLog.sentAt}, NOW())`,
              lastError: null,
            })
            .where(
              and(
                eq(schema.whatsappMessageLog.evolutionMessageId, messageId),
                inArray(schema.whatsappMessageLog.status, ["pending", "sending"]),
              ),
            );
        } else if (cleanPhone && organizationId) {
          // Try to link with latest pending message to that phone
          const pending = await db.query.whatsappMessageLog.findFirst({
            where: and(
              eq(schema.whatsappMessageLog.organizationId, organizationId),
              eq(schema.whatsappMessageLog.recipientPhone, cleanPhone),
              inArray(schema.whatsappMessageLog.status, ["pending", "sending"]),
            ),
            orderBy: [desc(schema.whatsappMessageLog.createdAt)],
          });

          if (pending && messageId) {
            await db
              .update(schema.whatsappMessageLog)
              .set({
                status: "sent",
                evolutionMessageId: messageId,
                sentAt: new Date(),
                lastError: null,
              })
              .where(eq(schema.whatsappMessageLog.id, pending.id));
          }
        }
      }
    }

    return NextResponse.json({
      received: true,
      event: eventRaw,
    });
  } catch (error) {
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
