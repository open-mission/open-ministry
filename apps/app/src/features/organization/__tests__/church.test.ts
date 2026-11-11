import { describe, expect, it } from "bun:test";
import {
  getDepartmentTerminology,
  parseChurchMetadata,
} from "@/lib/church";

describe("Church Nomenclature & Metadata", () => {
  it("defaults to Departamentos when metadata has no nomenclature set", () => {
    const terminology = getDepartmentTerminology(null);
    expect(terminology.type).toBe("departments");
    expect(terminology.singular).toBe("Departamento");
    expect(terminology.plural).toBe("Departamentos");
  });

  it("parses presets like Ministérios correctly", () => {
    const meta = parseChurchMetadata(
      JSON.stringify({
        departmentNomenclature: {
          type: "ministries",
          singular: "Ministério",
          plural: "Ministérios",
        },
      }),
    );
    const terminology = getDepartmentTerminology(meta);
    expect(terminology.type).toBe("ministries");
    expect(terminology.singular).toBe("Ministério");
    expect(terminology.plural).toBe("Ministérios");
  });

  it("supports custom terminology defined by the church", () => {
    const meta = parseChurchMetadata(
      JSON.stringify({
        departmentNomenclature: {
          type: "custom",
          singular: "Célula",
          plural: "Células",
        },
      }),
    );
    const terminology = getDepartmentTerminology(meta);
    expect(terminology.type).toBe("custom");
    expect(terminology.singular).toBe("Célula");
    expect(terminology.plural).toBe("Células");
  });
});
