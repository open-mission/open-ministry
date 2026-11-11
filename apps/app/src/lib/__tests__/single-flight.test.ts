import { describe, expect, it } from "bun:test";

import { singleFlight } from "@/lib/single-flight";

describe("singleFlight", () => {
  it("coalesces concurrent calls for the same key into one fetch", async () => {
    const key = `test:dedupe:${crypto.randomUUID()}`;
    let calls = 0;

    const fetcher = async () => {
      calls += 1;
      // Yield so every caller reaches the in-flight map before resolution.
      await Promise.resolve();
      return { value: 7 };
    };

    const results = await Promise.all(
      Array.from({ length: 8 }, () => singleFlight(key, fetcher)),
    );

    expect(calls).toBe(1);
    expect(results).toHaveLength(8);
    expect(results.every((result) => result.value === 7)).toBe(true);
  });

  it("runs the fetcher again once the previous flight settled", async () => {
    const key = `test:sequential:${crypto.randomUUID()}`;
    let calls = 0;

    const fetcher = async () => {
      calls += 1;
      return calls;
    };

    expect(await singleFlight(key, fetcher)).toBe(1);
    expect(await singleFlight(key, fetcher)).toBe(2);
    expect(calls).toBe(2);
  });

  it("does not keep failed promises in flight", async () => {
    const key = `test:retry:${crypto.randomUUID()}`;
    let calls = 0;

    const failing = async () => {
      calls += 1;
      throw new Error("temporary failure");
    };

    await expect(singleFlight(key, failing)).rejects.toThrow(
      "temporary failure",
    );
    await expect(singleFlight(key, failing)).rejects.toThrow(
      "temporary failure",
    );
    expect(calls).toBe(2);
  });
});
