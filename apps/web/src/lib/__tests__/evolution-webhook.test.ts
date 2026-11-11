import { describe, expect, it } from "bun:test";
import { GET, POST } from "@/app/api/webhooks/evolution/route";

describe("Evolution Go Webhook Handler", () => {
  it("responds to GET health check with status ok", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.service).toContain("Evolution Go");
  });

  it("handles empty or invalid JSON safely with 400", async () => {
    const req = new Request("http://localhost:3000/api/webhooks/evolution", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("handles valid webhook ping and acknowledges with 200", async () => {
    const req = new Request("http://localhost:3000/api/webhooks/evolution", {
      method: "POST",
      body: JSON.stringify({
        event: "connection.update",
        instance: "test-instance",
        data: { state: "open" },
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
    expect(data.event).toBe("connection.update");
  });
});
