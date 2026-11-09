import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getQStashReceiver, type NotificationJob } from "@/lib/queue";
import {
  getOrganizationEvolutionConfig,
  buildWhatsAppMessageText,
} from "@/lib/notification-service";
import { sendEvolutionTextMessage } from "@/lib/evolution-api";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const receiver = getQStashReceiver();

    // Verify signature if QStash signing keys are configured
    if (receiver) {
      const signature = req.headers.get("upstash-signature");
      if (!signature) {
        return NextResponse.json(
          { error: "Assinatura QStash ausente" },
          { status: 401 },
        );
      }

      const isValid = await receiver.verify({
        signature,
        body: rawBody,
        url: req.url,
      });

      if (!isValid) {
        return NextResponse.json(
          { error: "Assinatura QStash inválida" },
          { status: 401 },
        );
      }
    }

    const job = JSON.parse(rawBody) as NotificationJob;

    if (!job.organizationId || !job.recipientPhone) {
      return NextResponse.json(
        { error: "Payload incompleto: organizationId e recipientPhone são obrigatórios." },
        { status: 400 },
      );
    }

    const { config } = await getOrganizationEvolutionConfig(job.organizationId);
    if (!config) {
      return NextResponse.json(
        { message: "Canal do WhatsApp inativo ou não configurado." },
        { status: 200 },
      );
    }

    const text =
      (job.metadata?.text as string) ||
      buildWhatsAppMessageText(job.type, {
        name: job.recipientName || "Membro",
        churchName: (job.metadata?.churchName as string) || "Igreja",
        title: job.title,
        body: job.body,
        href: job.href,
        metadata: job.metadata,
      });

    const result = await sendEvolutionTextMessage({
      config,
      to: job.recipientPhone,
      text,
    });

    if (job.whatsappLogId) {
      if (!result.ok) {
        await db
          .update(schema.whatsappMessageLog)
          .set({
            status: "failed",
            lastError: result.error || "Falha no disparo via QStash",
            attempts: sql`${schema.whatsappMessageLog.attempts} + 1`,
          })
          .where(eq(schema.whatsappMessageLog.id, job.whatsappLogId));
      } else {
        await db
          .update(schema.whatsappMessageLog)
          .set({
            status: "sent",
            evolutionMessageId: result.messageId ?? null,
            sentAt: new Date(),
            lastError: null,
            attempts: sql`${schema.whatsappMessageLog.attempts} + 1`,
          })
          .where(eq(schema.whatsappMessageLog.id, job.whatsappLogId));
      }
    }

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Erro no processamento do webhook QStash:", error);
    return NextResponse.json(
      { error: "Erro interno no processamento da mensagem." },
      { status: 500 },
    );
  }
}
