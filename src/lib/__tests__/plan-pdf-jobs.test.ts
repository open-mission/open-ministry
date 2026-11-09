import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { generateEventPlanPdfBuffer } = await import("@/lib/pdf/generator");
const { computePlanItemTimes } = await import("@/lib/plan-utils");
const { sanitizePdfText } = await import(
  "@/components/events/event-plan-pdf-document"
);

describe("Plan PDF & Background Jobs Engine", () => {
  it("sanitizes emojis and surrogate pairs to avoid PDF text overlapping", () => {
    expect(sanitizePdfText("Culto de Louvor & Adoração 🙌🔥")).toBe(
      "Culto de Louvor & Adoração",
    );
    expect(sanitizePdfText("🎵 Tu és + Águas Purificadoras")).toBe(
      "Tu és + Águas Purificadoras",
    );
    expect(sanitizePdfText("📅 8 de novembro de 2026")).toBe(
      "8 de novembro de 2026",
    );
    expect(sanitizePdfText(null)).toBe("");
    expect(sanitizePdfText(undefined)).toBe("");
  });

  it("renders a valid PDF buffer using @react-pdf/renderer v4", async () => {
    const baseDate = new Date("2026-10-15T19:00:00Z");

    const sampleItems = [
      {
        id: "item-1",
        eventId: "event-123",
        sectionId: null,
        type: "header",
        title: "Abertura & Louvor",
        description: "Momento inicial de comunhão e boas-vindas",
        durationSeconds: 0,
        order: 0,
        personId: null,
        customResponsible: null,
      },
      {
        id: "item-2",
        eventId: "event-123",
        sectionId: null,
        type: "item",
        title: "Louvor 1: Bondade de Deus",
        description: "Entrada com a congregação",
        durationSeconds: 360,
        order: 1,
        personId: null,
        customResponsible: "Ministério de Louvor",
        song: {
          id: "song-1",
          title: "Bondade de Deus",
          artist: "Isaías Saad",
          tone: "G",
          bpm: 70,
        },
      },
      {
        id: "item-3",
        eventId: "event-123",
        sectionId: null,
        type: "item",
        title: "Palavra Pastoral",
        description: "Mensagem da noite",
        durationSeconds: 2400,
        order: 2,
        personId: null,
        customResponsible: "Pr. João Silva",
      },
    ];

    const { computedItems, totalPlanSeconds } = computePlanItemTimes(
      baseDate,
      sampleItems,
    );

    expect(computedItems.length).toBe(3);
    expect(totalPlanSeconds).toBe(2760); // 360 + 2400

    const buffer = await generateEventPlanPdfBuffer({
      organizationName: "Igreja Batista Central",
      eventTitle: "Culto de Celebração de Domingo",
      kindLabel: "Culto de Celebração",
      dateLabel: "15 de Outubro de 2026",
      timeLabel: "19:00 – 21:00",
      location: "Templo Principal",
      items: computedItems,
      totalPlannedSeconds: totalPlanSeconds,
    });

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(100);

    // Validar assinatura mágica do arquivo PDF (%PDF-)
    const pdfHeader = buffer.subarray(0, 5).toString("utf-8");
    expect(pdfHeader).toBe("%PDF-");
  });
});
