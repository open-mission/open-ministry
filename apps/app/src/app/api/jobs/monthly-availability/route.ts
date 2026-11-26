import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { dispatchNotification } from "@/lib/notification-service";
import { verifyQueueEndpointAuth } from "@/lib/queue";

const BATCH_SIZE = 10;

type DispatchPerson = {
  id: string;
  userId: string | null;
  phone: string | null;
  name: string | null;
  organizationId: string;
};

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    // Falhe fechado: sem assinatura válida (ou CRON_SECRET) o job não roda —
    // evita disparo de broadcast de WhatsApp não autenticado.
    const auth = await verifyQueueEndpointAuth(req, rawBody);
    if (!auth.ok) {
      return NextResponse.json(
        { error: `Assinatura QStash inválida (${auth.reason})` },
        { status: 401 },
      );
    }

    const channels = await db.query.organizationNotificationChannel.findMany({
      where: eq(schema.organizationNotificationChannel.isActive, true),
      with: {
        organization: true,
      },
      limit: 500,
    });

    const activeChannels = channels.filter((channel) =>
      Boolean(channel.organizationId),
    );
    const organizationIds = [
      ...new Set(activeChannels.map((channel) => channel.organizationId)),
    ];

    // Antes havia um `person.findMany` por organização dentro do loop.
    const peopleByOrg = new Map<string, DispatchPerson[]>();
    if (organizationIds.length > 0) {
      const people = await db.query.person.findMany({
        where: inArray(schema.person.organizationId, organizationIds),
        columns: {
          id: true,
          organizationId: true,
          userId: true,
          phone: true,
          name: true,
        },
        limit: 2000,
      });

      for (const person of people) {
        const list = peopleByOrg.get(person.organizationId) ?? [];
        list.push(person);
        peopleByOrg.set(person.organizationId, list);
      }
    }

    const dispatches: Array<() => Promise<unknown>> = [];
    for (const channel of activeChannels) {
      const churchName = channel.organization?.name || "Igreja";

      for (const person of peopleByOrg.get(channel.organizationId) ?? []) {
        if (!person.phone) continue;

        dispatches.push(() =>
          dispatchNotification({
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
              churchName,
              link: "/dashboard/schedules",
            },
          }),
        );
      }
    }

    // Lotes com concorrência limitada: não dispara centenas de requests em
    // sequência, nem todos ao mesmo tempo.
    let totalDispatched = 0;
    for (let start = 0; start < dispatches.length; start += BATCH_SIZE) {
      const batch = dispatches.slice(start, start + BATCH_SIZE);
      const settled = await Promise.allSettled(batch.map((dispatch) => dispatch()));

      for (const result of settled) {
        if (result.status === "fulfilled") {
          totalDispatched++;
          continue;
        }

        console.error(
          "[monthly-availability] Falha ao despachar notificação:",
          result.reason,
        );
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
