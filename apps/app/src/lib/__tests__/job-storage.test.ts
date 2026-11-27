import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

let uploaded: { data?: { key: string; ufsUrl: string }; error?: unknown } | null =
  null;
const deletedKeys: string[] = [];

function installMocks() {
  mock.module("server-only", () => ({}));
  mock.module("uploadthing/server", () => ({
    UTApi: class {
      async uploadFiles() {
        return [uploaded];
      }
      async deleteFiles(key: string) {
        deletedKeys.push(key);
        return { success: true };
      }
    },
  }));
}

installMocks();

const storage = await import(`@/lib/jobs/storage?wave5=${Date.now()}`);
const originalToken = process.env.UPLOADTHING_TOKEN;

beforeEach(() => {
  uploaded = null;
  deletedKeys.length = 0;
  installMocks();
});

describe("job file storage", () => {
  it("usa disco local quando UPLOADTHING_TOKEN não está configurado", async () => {
    delete process.env.UPLOADTHING_TOKEN;

    const stored = await storage.saveJobFile(
      "job-local-test",
      Buffer.from("%PDF-1.4 local"),
    );

    expect(stored.storageProvider).toBe("local");
    expect(stored.fileKey).toContain("job-local-test.pdf");
    expect((await storage.getJobFile("job-local-test"))?.toString()).toContain(
      "%PDF-1.4",
    );

    await storage.deleteJobFile("job-local-test");
    expect(await storage.getJobFile("job-local-test")).toBeNull();
  });

  it("sobe o PDF no UploadThing e remove pelo fileKey quando configurado", async () => {
    process.env.UPLOADTHING_TOKEN = "token-de-teste";
    uploaded = {
      data: { key: "file-key-123", ufsUrl: "https://abc123.ufs.sh/f/key" },
    };

    const stored = await storage.saveJobFile(
      "job-upload-test",
      Buffer.from("%PDF-1.4 upload"),
    );

    expect(stored).toEqual({
      storageProvider: "uploadthing",
      fileKey: "file-key-123",
      fileUrl: "https://abc123.ufs.sh/f/key",
    });

    await storage.deleteJobFile("job-upload-test", "pdf", stored.fileKey);
    expect(deletedKeys).toEqual(["file-key-123"]);
  });

  it("faz fallback local se o UploadThing falhar", async () => {
    process.env.UPLOADTHING_TOKEN = "token-de-teste";
    uploaded = { error: { code: "UPLOAD_FAILED", message: "falhou" } };

    const stored = await storage.saveJobFile(
      "job-fallback-test",
      Buffer.from("%PDF-1.4 fallback"),
    );

    expect(stored.storageProvider).toBe("local");
    expect((await storage.getJobFile("job-fallback-test"))?.toString()).toContain(
      "%PDF-1.4",
    );
    await storage.deleteJobFile("job-fallback-test");
  });
});

afterAll(() => {
  if (originalToken === undefined) delete process.env.UPLOADTHING_TOKEN;
  else process.env.UPLOADTHING_TOKEN = originalToken;
});
