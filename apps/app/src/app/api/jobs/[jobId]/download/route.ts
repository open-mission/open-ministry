import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { getJobFile } from "@/lib/jobs/storage";

/** Aceita apenas URLs HTTPS do domínio oficial do UploadThing. */
export function isAllowedUploadThingUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    return host === "utfs.io" || host === "ufs.sh" || host.endsWith(".ufs.sh");
  } catch {
    return false;
  }
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}

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

    const result = (job.result ?? {}) as {
      fileName?: string;
      fileUrl?: string;
    };
    const fileName = safeFileName(
      result.fileName || `download-${jobId}.pdf`,
    );
    const headers = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    };

    if (result.fileUrl) {
      if (!isAllowedUploadThingUrl(result.fileUrl)) {
        return NextResponse.json(
          { error: "Endereço de arquivo inválido." },
          { status: 400 },
        );
      }

      const remote = await fetch(result.fileUrl, {
        redirect: "error",
        cache: "no-store",
      });
      if (!remote.ok) {
        return NextResponse.json(
          { error: "Não foi possível carregar o arquivo." },
          { status: 502 },
        );
      }

      return new Response(remote.body, { headers });
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

    return new Response(new Uint8Array(buffer), { headers });
  } catch (error) {
    console.error("Erro ao baixar arquivo da tarefa:", error);
    return NextResponse.json(
      { error: "Falha ao processar download." },
      { status: 500 },
    );
  }
}
