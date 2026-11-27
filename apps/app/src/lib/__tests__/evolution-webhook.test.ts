import { describe, expect, it } from "bun:test";

import { authenticateEvolutionWebhook } from "@/lib/evolution-webhook";

const findChannel = async (token: string) =>
  token === "secret-1"
    ? {
        id: "channel-1",
        organizationId: "org-1",
        webhookSecret: "secret-1",
        instanceName: "igreja-1",
      }
    : null;

describe("authenticateEvolutionWebhook", () => {
  it("accepts a valid token and returns the channel organization", async () => {
    const result = await authenticateEvolutionWebhook(
      "secret-1",
      findChannel,
      "production",
    );

    expect(result).toEqual({
      ok: true,
      organizationId: "org-1",
      channelId: "channel-1",
      instanceName: "igreja-1",
    });
  });

  it("rejects an unknown token in production", async () => {
    const result = await authenticateEvolutionWebhook(
      "forged-token",
      findChannel,
      "production",
    );

    expect(result).toEqual({ ok: false });
  });

  it("rejects an unknown token in development too", async () => {
    const result = await authenticateEvolutionWebhook(
      "forged-token",
      findChannel,
      "development",
    );

    expect(result).toEqual({ ok: false });
  });

  it("rejeita token que o lookup devolveu mas não confere com o segredo gravado", async () => {
    const result = await authenticateEvolutionWebhook(
      "quase-secret-1",
      async () => ({
        id: "channel-1",
        organizationId: "org-1",
        webhookSecret: "secret-1",
        instanceName: "igreja-1",
      }),
      "production",
    );

    expect(result).toEqual({ ok: false });
  });

  it("rejects a missing token in production", async () => {
    const result = await authenticateEvolutionWebhook(
      null,
      findChannel,
      "production",
    );

    expect(result).toEqual({ ok: false });
  });

  it("allows a missing token outside production with no organization bound", async () => {
    const result = await authenticateEvolutionWebhook(
      null,
      findChannel,
      "development",
    );

    expect(result).toEqual({
      ok: true,
      organizationId: null,
      channelId: null,
      instanceName: null,
    });
  });
});
