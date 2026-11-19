import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

import * as schema from "@/db/schema";

mock.module("server-only", () => ({}));

// As ações registram erros esperados no console; silencie o ruído do teste.
spyOn(console, "error").mockImplementation(() => {});

type NoteRow = {
  departmentId: string;
  sectionKey: string;
  note: string;
};

type FormationRow = {
  departmentId: string;
  functionId: string;
  sortOrder: number;
};

const dbState = {
  songExists: true,
  notes: [] as NoteRow[],
  formation: [] as FormationRow[],
  departmentFunctions: [] as { id: string }[],
  notesDeleted: false,
  formationDeleted: false,
  insertedNotes: [] as Record<string, unknown>[],
  insertedFormation: [] as Record<string, unknown>[],
  invalidated: [] as string[],
};

mock.module("@/db", () => ({
  db: {
    query: {
      song: {
        findFirst: async () => (dbState.songExists ? { id: "song-1" } : null),
      },
      songSectionNote: {
        findMany: async () => dbState.notes,
      },
      songFormationFunction: {
        findMany: async () => dbState.formation,
      },
      departmentFunction: {
        findMany: async () => dbState.departmentFunctions,
      },
    },
    delete: (table: unknown) => ({
      where: async () => {
        if (table === schema.songSectionNote) dbState.notesDeleted = true;
        if (table === schema.songFormationFunction) {
          dbState.formationDeleted = true;
        }
      },
    }),
    insert: (table: unknown) => ({
      values: async (rows: Record<string, unknown>[]) => {
        if (table === schema.songSectionNote) dbState.insertedNotes = rows;
        if (table === schema.songFormationFunction) {
          dbState.insertedFormation = rows;
        }
      },
    }),
    batch: async (queries: Promise<unknown>[]) => Promise.all(queries),
  },
  schema,
}));

mock.module("@/lib/organizations", () => ({
  requireOrganizationContext: async () => ({
    session: { user: { id: "user-1" } },
    organization: { id: "org-1", name: "Church" },
    role: "member",
    isAdmin: false,
  }),
}));

const permissionState = { read: true, updateSong: true, musicEnabled: true };

mock.module("@/lib/permissions/service", () => ({
  can: async (moduleKey: string, action: string) => {
    if (moduleKey !== "music") return false;
    if (action === "read") return permissionState.read;
    if (action === "updateSong") return permissionState.updateSong;
    return false;
  },
  isOrganizationModuleEnabled: async (_organizationId: string, key: string) =>
    key === "music" && permissionState.musicEnabled,
  requirePermission: async () => {},
}));

const departmentState = { departments: [] as Record<string, unknown>[] };

mock.module("@/lib/departments", () => ({
  listDepartments: async () => departmentState.departments,
}));

mock.module("@/lib/songs", () => ({
  invalidateSongCache: async (organizationId: string, songId?: string) => {
    dbState.invalidated.push(`${organizationId}:${songId ?? ""}`);
  },
}));

import {
  getSongArrangementsAction,
  saveSongFormationAction,
  saveSongSectionNotesAction,
} from "@/app/actions/songs";

function musicDepartment(overrides: Record<string, unknown>) {
  return {
    id: "dep-louvor",
    name: "Louvor",
    functions: [
      { id: "fn-guitarra", name: "Guitarra" },
      { id: "fn-voz", name: "Voz" },
    ],
    members: [{ person: { userId: "user-1" } }],
    modules: [{ moduleKey: "music" }],
    ...overrides,
  };
}

beforeEach(() => {
  permissionState.read = true;
  permissionState.updateSong = true;
  permissionState.musicEnabled = true;

  dbState.songExists = true;
  dbState.notes = [];
  dbState.formation = [];
  dbState.departmentFunctions = [];
  dbState.notesDeleted = false;
  dbState.formationDeleted = false;
  dbState.insertedNotes = [];
  dbState.insertedFormation = [];
  dbState.invalidated = [];

  departmentState.departments = [musicDepartment({})];
});

afterAll(() => {
  mock.restore();
});

describe("getSongArrangementsAction", () => {
  it("retorna erro quando o usuário não pode ler o módulo de músicas", async () => {
    permissionState.read = false;

    const result = await getSongArrangementsAction("song-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("permissão");
    }
  });

  it("retorna apenas departamentos de música acessíveis ao usuário", async () => {
    dbState.notes = [
      { departmentId: "dep-louvor", sectionKey: "intro#1", note: "Só guitarra" },
      { departmentId: "dep-midia", sectionKey: "intro#1", note: "Outro" },
    ];
    dbState.formation = [
      { departmentId: "dep-louvor", functionId: "fn-voz", sortOrder: 1 },
      { departmentId: "dep-louvor", functionId: "fn-guitarra", sortOrder: 0 },
    ];
    departmentState.departments = [
      musicDepartment({}),
      musicDepartment({
        id: "dep-midia",
        name: "Mídia",
        modules: [{ moduleKey: "media" }],
      }),
      musicDepartment({
        id: "dep-sem-acesso",
        name: "Louvor Jovem",
        members: [{ person: { userId: "user-2" } }],
      }),
    ];

    const result = await getSongArrangementsAction("song-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.departments.map((department) => department.departmentId)).toEqual([
      "dep-louvor",
    ]);
    expect(result.departments[0]?.notes).toEqual({ "intro#1": "Só guitarra" });
    expect(result.departments[0]?.selectedFunctionIds).toEqual([
      "fn-voz",
      "fn-guitarra",
    ]);
    expect(result.departments[0]?.functions).toEqual([
      { id: "fn-guitarra", name: "Guitarra" },
      { id: "fn-voz", name: "Voz" },
    ]);
  });

  it("retorna erro quando a música não pertence à organização", async () => {
    dbState.songExists = false;

    const result = await getSongArrangementsAction("song-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Música não encontrada.");
    }
  });
});

describe("saveSongSectionNotesAction", () => {
  it("retorna erro sem permissão de editar música", async () => {
    permissionState.updateSong = false;

    const result = await saveSongSectionNotesAction("song-1", "dep-louvor", {
      "intro#1": "Solo",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("permissão");
    }
    expect(dbState.insertedNotes).toHaveLength(0);
  });

  it("rejeita departamento fora do escopo do usuário", async () => {
    const result = await saveSongSectionNotesAction("song-1", "dep-midia", {
      "intro#1": "Solo",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Departamento indisponível para esta música.");
    }
    expect(dbState.notesDeleted).toBe(false);
  });

  it("persiste apenas notas não vazias e invalida o cache", async () => {
    dbState.departmentFunctions = [{ id: "fn-guitarra" }];

    const result = await saveSongSectionNotesAction("song-1", "dep-louvor", {
      "intro#1": "  Solo de guitarra  ",
      "refrao#1": "   ",
    });

    expect(result.ok).toBe(true);
    expect(dbState.notesDeleted).toBe(true);
    expect(dbState.insertedNotes).toHaveLength(1);
    expect(dbState.insertedNotes[0]).toMatchObject({
      organizationId: "org-1",
      songId: "song-1",
      departmentId: "dep-louvor",
      sectionKey: "intro#1",
      note: "Solo de guitarra",
      updatedById: "user-1",
    });
    expect(dbState.invalidated).toEqual(["org-1:song-1"]);
  });
});

describe("saveSongFormationAction", () => {
  it("retorna erro sem permissão de editar música", async () => {
    permissionState.updateSong = false;

    const result = await saveSongFormationAction("song-1", "dep-louvor", [
      "fn-guitarra",
    ]);

    expect(result.ok).toBe(false);
    expect(dbState.formationDeleted).toBe(false);
  });

  it("rejeita função que não pertence ao departamento", async () => {
    dbState.departmentFunctions = [{ id: "fn-guitarra" }];

    const result = await saveSongFormationAction("song-1", "dep-louvor", [
      "fn-guitarra",
      "fn-bateria",
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Uma das funções não pertence a este departamento.");
    }
    expect(dbState.insertedFormation).toHaveLength(0);
  });

  it("salva a formação deduplicada mantendo a ordem enviada", async () => {
    dbState.departmentFunctions = [{ id: "fn-guitarra" }, { id: "fn-voz" }];

    const result = await saveSongFormationAction("song-1", "dep-louvor", [
      "fn-voz",
      "fn-guitarra",
      "fn-voz",
    ]);

    expect(result.ok).toBe(true);
    expect(dbState.formationDeleted).toBe(true);
    expect(
      dbState.insertedFormation.map((row) => ({
        functionId: row.functionId,
        sortOrder: row.sortOrder,
      })),
    ).toEqual([
      { functionId: "fn-voz", sortOrder: 0 },
      { functionId: "fn-guitarra", sortOrder: 1 },
    ]);
    expect(dbState.invalidated).toEqual(["org-1:song-1"]);
  });
});
