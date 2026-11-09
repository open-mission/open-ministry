import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { getJobFile } from "@/lib/jobs/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const orgId = session.session.activeOrganizationId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Nenhuma igreja ativa selecionada" },
        { status: 400 },
      );
    }

    const job = await db.query.backgroundJob.findFirst({
      where: and(
        eq(schema.backgroundJob.id, jobId),
        eq(schema.backgroundJob.organizationId, orgId),
      ),
    });

    if (!job) {
      return NextResponse.json(
        { error: "Tarefa não encontrada." },
        { status: 404 },
      );
    }

    if (job.status !== "completed") {
      return NextResponse.json(
        { error: "O arquivo desta tarefa ainda não está pronto." },
        { status: 400 },
      );
    }

    const buffer = await getJobFile(jobId, "pdf");
    if (!buffer) {
      return NextResponse.json(
        {
          error:
            "O arquivo gerado expirou do armazenamento temporário. Gere o arquivo novamente.",
        },
        { status: 404 },
      );
    }

    const fileName =
      (job.result as { fileName?: string })?.fileName ||
      `download-${jobId}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao baixar arquivo da tarefa:", error);
    return NextResponse.json(
      { error: "Falha ao processar download." },
      { status: 500 },
    );
  }
}
