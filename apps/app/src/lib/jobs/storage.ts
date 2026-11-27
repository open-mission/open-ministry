import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import { UTApi } from "uploadthing/server";

const JOBS_DIR = path.join(os.tmpdir(), "openministry-jobs");

export type StoredJobFile = {
  storageProvider: "uploadthing" | "local";
  /** fileKey do UploadThing no provider remoto; path absoluto no fallback local. */
  fileKey: string;
  fileUrl?: string;
  localPath?: string;
};

function hasUploadThingToken(): boolean {
  return Boolean(process.env.UPLOADTHING_TOKEN);
}

async function ensureDir() {
  try {
    await fs.mkdir(JOBS_DIR, { recursive: true });
  } catch {
    // Already exists
  }
}

function localPathFor(jobId: string, extension: string): string {
  // jobId é gerado internamente, mas limitamos o nome por defesa em profundidade.
  const safeId = jobId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(JOBS_DIR, `${safeId}.${extension.replace(/[^a-zA-Z0-9]/g, "")}`);
}

/**
 * Persiste o PDF no UploadThing quando configurado; caso contrário mantém o
 * fallback em disco local (dev/teste). O retorno descreve onde o arquivo está.
 */
export async function saveJobFile(
  jobId: string,
  buffer: Buffer,
  extension = "pdf",
): Promise<StoredJobFile> {
  if (hasUploadThingToken()) {
    const fileName = `${jobId}.${extension}`;
    const file = new File([new Uint8Array(buffer)], fileName, {
      type: "application/pdf",
    });
    const [uploaded] = await new UTApi().uploadFiles([file]);

    if (uploaded?.data) {
      return {
        storageProvider: "uploadthing",
        fileKey: uploaded.data.key,
        fileUrl: uploaded.data.ufsUrl,
      };
    }

    console.error(
      "[jobs/storage] Falha no UploadThing; usando disco local:",
      uploaded?.error ?? "sem resposta",
    );
  }

  await ensureDir();
  const filePath = localPathFor(jobId, extension);
  await fs.writeFile(filePath, buffer);
  return {
    storageProvider: "local",
    fileKey: filePath,
    localPath: filePath,
  };
}

export async function getJobFile(
  jobId: string,
  extension = "pdf",
): Promise<Buffer | null> {
  try {
    const filePath = localPathFor(jobId, extension);
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function deleteJobFile(
  jobId: string,
  extension = "pdf",
  fileKey?: string | null,
): Promise<void> {
  // O download remoto usa o fileUrl salvo no result; a limpeza do objeto é
  // best-effort e nunca impede a remoção do registro do job.
  if (hasUploadThingToken() && fileKey) {
    try {
      await new UTApi().deleteFiles(fileKey);
    } catch (error) {
      console.warn("[jobs/storage] Falha ao remover arquivo no UploadThing:", error);
    }
  }

  try {
    await fs.unlink(localPathFor(jobId, extension));
  } catch {
    // Ignore if file doesn't exist
  }
}
