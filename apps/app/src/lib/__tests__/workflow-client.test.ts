import { afterEach, describe, expect, it, mock } from "bun:test";

let baseUrl: string | null = "https://app.openministry.online";
const triggers: Array<{ url: string; body: unknown; workflowRunId?: string }> =
  [];
let shouldThrow = false;

function installMocks() {
  mock.module("server-only", () => ({}));
  mock.module("@/lib/app-url", () => ({
    getAppBaseUrl: () => baseUrl,
  }));
  mock.module("@upstash/workflow", () => ({
    Client: class {
      async trigger(input: {
        url: string;
        body: unknown;
        workflowRunId?: string;
      }) {
        if (shouldThrow) throw new Error("qstash indisponível");
        triggers.push(input);
        return { workflowRunId: `wfr_${input.workflowRunId ?? "auto"}` };
      }
    },
  }));
}

installMocks();

const workflows = await import(
  `@/lib/workflows/client?wave5=${Date.now()}`
);

const original = {
  QSTASH_DEV: process.env.QSTASH_DEV,
  QSTASH_TOKEN: process.env.QSTASH_TOKEN,
};

function configureQstash(configured: boolean) {
  if (configured) process.env.QSTASH_TOKEN = "token-de-teste";
  else delete process.env.QSTASH_TOKEN;
}

afterEach(() => {
  configureQstash(true);
  baseUrl = "https://app.openministry.online";
  shouldThrow = false;
  triggers.length = 0;
  delete process.env.QSTASH_DEV;
  installMocks();
});

describe("isWorkflowEnabled", () => {
  it("exige QStash e uma baseUrl configurada", () => {
    configureQstash(true);
    expect(workflows.isWorkflowEnabled()).toBe(true);

    configureQstash(false);
    expect(workflows.isWorkflowEnabled()).toBe(false);

    configureQstash(true);
    baseUrl = null;
    expect(workflows.isWorkflowEnabled()).toBe(false);
  });

  it("aceita QSTASH_DEV=true em desenvolvimento local", () => {
    configureQstash(false);
    baseUrl = null;
    process.env.QSTASH_DEV = "true";
    expect(workflows.isWorkflowEnabled()).toBe(true);
  });
});

describe("triggerJobsWorkflow / triggerAnnouncementWorkflow", () => {
  it("dispara endpoint de jobs com workflowRunId estável", async () => {
    configureQstash(true);
    const id = await workflows.triggerJobsWorkflow({
      jobId: "job-1",
      organizationId: "org-1",
    });

    expect(id).toBe("wfr_job-1");
    expect(triggers[0]).toMatchObject({
      url: "https://app.openministry.online/api/workflows/jobs",
      body: { jobId: "job-1", organizationId: "org-1" },
      workflowRunId: "job-1",
    });
  });

  it("dispara endpoint de avisos com payload enxuto", async () => {
    configureQstash(true);
    await workflows.triggerAnnouncementWorkflow({
      jobId: "job-2",
      organizationId: "org-1",
      actorId: "user-1",
      announcementBatchId: "batch-1",
      title: "Aviso",
      body: "Mensagem",
      sendWhatsApp: true,
      sendEmail: false,
      sendPush: false,
      targetType: "all",
    });

    expect(triggers[0].url).toBe(
      "https://app.openministry.online/api/workflows/announcements",
    );
    expect(triggers[0].body).toMatchObject({
      jobId: "job-2",
      announcementBatchId: "batch-1",
      targetType: "all",
    });
  });

  it("falha graciosamente quando o QStash rejeita o disparo", async () => {
    configureQstash(true);
    shouldThrow = true;
    expect(await workflows.triggerJobsWorkflow({ jobId: "job-3" })).toBeNull();
  });

  it("não dispara nada quando o workflow está desabilitado", async () => {
    configureQstash(false);
    delete process.env.QSTASH_DEV;
    expect(await workflows.triggerJobsWorkflow({ jobId: "job-4" })).toBeNull();
    expect(triggers).toHaveLength(0);
  });
});
