export type JobType =
  | "export_cronograma_pdf"
  | "export_schedule_pdf"
  | "bulk_notification";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type JobResult = {
  downloadUrl?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  /** Onde o PDF foi persistido (UploadThing ou disco local no dev). */
  storageProvider?: "uploadthing" | "local";
  fileKey?: string;
  fileUrl?: string;
  /** Contagem de destinatários em avisos em background. */
  recipients?: number;
};

export type BackgroundJobRecord = {
  id: string;
  organizationId: string;
  type: string;
  title: string;
  status: JobStatus;
  progress: number;
  payload: Record<string, unknown> | null;
  result: JobResult | null;
  error: string | null;
  createdById: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};
