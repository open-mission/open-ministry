import { NextResponse } from "next/server";

import { verifyQueueEndpointAuth } from "@/lib/queue";
import {
  dispatchRehearsalReminder,
  sweepDueRehearsalReminders,
} from "@/features/rehearsals/services/rehearsals-service";

export async function GET() {
  // GET não pode disparar efeitos colaterais; o agendamento usa POST assinado.
  return NextResponse.json({ error: "Método não permitido" }, { status: 405 });
}

export async function POST(req: Request) {
  try {
    // Falhe fechado: sem assinatura válida (ou CRON_SECRET) o job não roda.
    const rawBody = await req.text();
    const auth = await verifyQueueEndpointAuth(req, rawBody);
    if (!auth.ok) {
      return NextResponse.json(
        { error: `Assinatura QStash inválida (${auth.reason})` },
        { status: 401 },
      );
    }

    let reminderId: string | undefined;
    try {
      const payload = rawBody ? (JSON.parse(rawBody) as unknown) : {};
      if (
        payload &&
        typeof payload === "object" &&
        typeof (payload as { reminderId?: unknown }).reminderId === "string"
      ) {
        reminderId = (payload as { reminderId: string }).reminderId;
      }
    } catch {
      return NextResponse.json(
        { error: "Payload JSON inválido." },
        { status: 400 },
      );
    }

    if (reminderId) {
      const result = await dispatchRehearsalReminder(reminderId);
      return NextResponse.json({
        success: result.status !== "failed",
        mode: "single",
        ...result,
      });
    }

    const sweep = await sweepDueRehearsalReminders();
    return NextResponse.json({ success: true, mode: "sweep", ...sweep });
  } catch (error) {
    console.error("[POST /api/jobs/rehearsal-reminders] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar lembretes de ensaio." },
      { status: 500 },
    );
  }
}
