import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const JOBS_DIR = path.join(os.tmpdir(), "openministry-jobs");

async function ensureDir() {
  try {
    await fs.mkdir(JOBS_DIR, { recursive: true });
  } catch {
    // Already exists
  }
}

export async function saveJobFile(
  jobId: string,
  buffer: Buffer,
  extension = "pdf",
): Promise<string> {
  await ensureDir();
  const filePath = path.join(JOBS_DIR, `${jobId}.${extension}`);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function getJobFile(
  jobId: string,
  extension = "pdf",
): Promise<Buffer | null> {
  try {
    const filePath = path.join(JOBS_DIR, `${jobId}.${extension}`);
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function deleteJobFile(
  jobId: string,
  extension = "pdf",
): Promise<void> {
  try {
    const filePath = path.join(JOBS_DIR, `${jobId}.${extension}`);
    await fs.unlink(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}
