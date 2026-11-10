import { describe, expect, it } from "bun:test";

import { whatsappLogKeys } from "@/hooks/use-whatsapp-logs";

describe("WhatsApp Logs React Query Keys", () => {
  it("generates stable hierarchical query keys", () => {
    expect(whatsappLogKeys.all).toEqual(["whatsapp-logs"]);
    expect(whatsappLogKeys.lists()).toEqual(["whatsapp-logs", "list"]);

    const filterAll = { status: "all", limit: 50 };
    expect(whatsappLogKeys.list(filterAll)).toEqual([
      "whatsapp-logs",
      "list",
      filterAll,
    ]);

    const filterFailed = { status: "failed", search: "joão" };
    expect(whatsappLogKeys.list(filterFailed)).toEqual([
      "whatsapp-logs",
      "list",
      filterFailed,
    ]);
  });
});
