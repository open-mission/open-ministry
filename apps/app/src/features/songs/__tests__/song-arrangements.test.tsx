import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DepartmentArrangementPicker } from "@/features/songs/components/department-arrangement-picker";
import {
  filterAccessibleDepartments,
  getLoadedDepartments,
  type DepartmentArrangement,
} from "@/features/songs/lib/song-arrangements";

const departments: DepartmentArrangement[] = [
  {
    departmentId: "dep-1",
    departmentName: "Louvor",
    notes: { "refrao#1": "Só guitarra" },
    selectedFunctionIds: [],
    functions: [{ id: "fn-1", name: "Guitarra" }],
  },
  {
    departmentId: "dep-2",
    departmentName: "Mídia",
    notes: {},
    selectedFunctionIds: [],
    functions: [],
  },
];

describe("Song arrangements", () => {
  it("arrangements filter by accessible departments", () => {
    const filtered = filterAccessibleDepartments(departments, ["dep-1"]);

    expect(filtered.map((department) => department.departmentId)).toEqual([
      "dep-1",
    ]);
    expect(filtered[0]?.notes["refrao#1"]).toBe("Só guitarra");
  });

  it("keeps every department returned by the server when no filter is given", () => {
    expect(
      filterAccessibleDepartments(departments).map(
        (department) => department.departmentId,
      ),
    ).toEqual(["dep-1", "dep-2"]);
  });

  it("não expõe arranjos da música anterior enquanto a nova carrega", () => {
    expect(
      getLoadedDepartments(departments, "song-b::null", "song-a::null"),
    ).toEqual([]);
    expect(getLoadedDepartments(departments, "song-a::null", "song-a::null")).toBe(
      departments,
    );
  });

  it("department picker lists departments with an accessible label", () => {
    const html = renderToStaticMarkup(
      createElement(DepartmentArrangementPicker, {
        departments: departments.map((department) => ({
          id: department.departmentId,
          name: department.departmentName,
        })),
        value: "dep-1",
        onChange: () => undefined,
      }),
    );

    expect(html).toContain("Departamento da formação");
    expect(html).toContain("Louvor");
    expect(html).toContain("Mídia");
  });
});
