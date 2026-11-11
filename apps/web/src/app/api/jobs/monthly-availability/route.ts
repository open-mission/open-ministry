import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getQStashReceiver } from "@/lib/queue";
import { dispatchNotification } from "@/lib/notification-service";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const receiver = getQStashReceiver();

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

    // Find all organizations with active WhatsApp notification channel
    const channels = await db.query.organizationNotificationChannel.findMany({
      where: eq(schema.organizationNotificationChannel.isActive, true),
      with: {
        organization: true,
      },
    });

    let totalDispatched = 0;

    for (const channel of channels) {
      if (!channel.organizationId) continue;

      // Find people with phone in this church
      const people = await db.query.person.findMany({
        where: eq(schema.person.organizationId, channel.organizationId),
      });

      for (const person of people) {
        if (!person.phone) continue;

        await dispatchNotification({
          organizationId: channel.organizationId,
          type: "monthly_availability",
          title: "Preencha sua disponibilidade para servir este mês",
          body: "Ajude os líderes a organizarem a escala dos cultos informando seus dias disponíveis.",
          href: "/dashboard/schedules",
          personId: person.id,
          userId: person.userId,
          phone: person.phone,
          name: person.name,
          metadata: {
            churchName: channel.organization?.name || "Igreja",
            link: "/dashboard/schedules",
          },
        });

        totalDispatched++;
      }
    }

    return NextResponse.json({
      success: true,
      totalDispatched,
    });
  } catch (error) {
    console.error("Erro no job de disponibilidade mensal:", error);
    return NextResponse.json(
      { error: "Falha ao executar job de disponibilidade mensal." },
      { status: 500 },
    );
  }
}
