import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { computePlanItemTimes } from "@/lib/plan-utils";
import { formatEventFullDate, formatEventTimeRange } from "@/lib/events";
import { eventKindLabels, type EventKind } from "@/lib/event-options";
import { generateEventPlanPdfStream } from "@/lib/pdf/generator";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    let eventRow = null;

    if (token) {
      // Acesso via link público compartilhado
      eventRow = await db.query.event.findFirst({
        where: and(
          eq(schema.event.id, eventId),
          eq(schema.event.publicShareToken, token),
          eq(schema.event.isPublicShareEnabled, true),
          eq(schema.event.publicShareAllowPdf, true),
        ),
        with: {
          organization: true,
          planItems: {
            with: {
              person: true,
              song: true,
            },
            orderBy: (items, { asc }) => [
              asc(items.order),
              asc(items.createdAt),
            ],
          },
        },
      });
    } else {
      // Acesso autenticado via painel
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (!session) {
        return NextResponse.json(
          { error: "Não autorizado" },
          { status: 401 },
        );
      }

      const orgId = session.session.activeOrganizationId;
      if (!orgId) {
        return NextResponse.json(
          { error: "Nenhuma igreja ativa selecionada" },
          { status: 400 },
        );
      }

      eventRow = await db.query.event.findFirst({
        where: and(
          eq(schema.event.id, eventId),
          eq(schema.event.organizationId, orgId),
        ),
        with: {
          organization: true,
          planItems: {
            with: {
              person: true,
              song: true,
            },
            orderBy: (items, { asc }) => [
              asc(items.order),
              asc(items.createdAt),
            ],
          },
        },
      });
    }

    if (!eventRow) {
      return NextResponse.json(
        { error: "Cronograma não encontrado ou download em PDF desativado." },
        { status: 404 },
      );
    }

    const { computedItems, totalPlanSeconds } = computePlanItemTimes(
      eventRow.startsAt,
      eventRow.planItems,
    );

    const kindLabel =
      eventKindLabels[eventRow.kind as EventKind] || "Culto ou Evento";

    const pdfStream = await generateEventPlanPdfStream({
      organizationName: eventRow.organization.name,
      organizationLogo: eventRow.organization.logo,
      eventTitle: eventRow.title,
      kindLabel,
      dateLabel: formatEventFullDate(eventRow.startsAt),
      timeLabel: formatEventTimeRange(eventRow.startsAt, eventRow.endsAt),
      location: eventRow.location,
      items: computedItems,
      totalPlannedSeconds: totalPlanSeconds,
    });

    const safeFilename = `cronograma-${eventRow.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")}.pdf`;

    return new Response(pdfStream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF do cronograma:", error);
    return NextResponse.json(
      { error: "Falha ao gerar o documento PDF do cronograma." },
      { status: 500 },
    );
  }
}
