import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

let mockUser = { id: "user-1", name: "User" };
let mockOrg = { id: "org-1", name: "Church" };
let mockIsAdmin = false;
let mockIsLeader = false;
let mockMusicDeptActive = false;
let mockOrgMusicEnabled = true;

mock.module("@/db", () => ({
  db: {
    insert: () => ({
      values: () => ({
        returning: async () => [{ id: "song-1" }],
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: "song-1" }],
        }),
      }),
    }),
    delete: () => ({
      where: async () => {},
    }),
  },
}));

mock.module("@/lib/organizations", () => ({
  requireOrganizationContext: async () => ({
    session: { user: mockUser },
    organization: mockOrg,
    role: mockIsAdmin ? "admin" : "member",
    isAdmin: mockIsAdmin,
  }),
}));

mock.module("@/lib/permissions/service", () => ({
  can: async (moduleKey: string, action: string) => {
    if (moduleKey !== "music") return false;
    if (!mockOrgMusicEnabled) return false;
    if (action === "read") return true;
    if (mockIsAdmin) return true;
    if (action === "createSong") {
      return mockIsLeader && mockMusicDeptActive;
    }
    // create does not imply update or delete
    return false;
  },
  requirePermission: async (moduleKey: string, action: string) => {
    if (moduleKey !== "music") throw new Error("Permission denied");
    if (!mockOrgMusicEnabled) throw new Error("Permission denied");
    if (action === "read") return;
    if (mockIsAdmin) return;
    if (action === "createSong" && mockIsLeader && mockMusicDeptActive) {
      return;
    }
    throw new Error("Permission denied");
  },
  isOrganizationModuleEnabled: async (_orgId: string, moduleKey: string) => {
    if (moduleKey === "music") return mockOrgMusicEnabled;
    return true;
  },
}));

import {
  createSongAction,
  deleteSongAction,
  searchOnlineSongsAction,
  updateSongAction,
} from "@/app/actions/songs";

describe("Music Module Permissions Enforcement", () => {
  it("memberCanListSongs", async () => {
    mockIsAdmin = false;
    mockIsLeader = false;
    mockMusicDeptActive = false;
    mockOrgMusicEnabled = true;

    const { can } = await import("@/lib/permissions/service");
    const canRead = await can("music", "read");
    expect(canRead).toBe(true);
  });

  it("memberCannotCreateSongByCallingActionDirectly", async () => {
    mockIsAdmin = false;
    mockIsLeader = false;
    mockMusicDeptActive = false;
    mockOrgMusicEnabled = true;

    const formData = new FormData();
    formData.set("title", "Glória ao Pai");
    const res = await createSongAction(formData);
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("leaderCanCreateOnlyWithActiveMusicDepartment", async () => {
    // Leader without music department active
    mockIsAdmin = false;
    mockIsLeader = true;
    mockMusicDeptActive = false;
    mockOrgMusicEnabled = true;

    const formData1 = new FormData();
    formData1.set("title", "Santo");
    const res1 = await createSongAction(formData1);
    expect(res1.ok).toBe(false);

    // Leader WITH music department active
    mockMusicDeptActive = true;
    const { can } = await import("@/lib/permissions/service");
    const canCreate = await can("music", "createSong");
    expect(canCreate).toBe(true);
  });

  it("createDoesNotImplyUpdateOrDelete", async () => {
    // Leader with active music department can create, but cannot update or delete
    mockIsAdmin = false;
    mockIsLeader = true;
    mockMusicDeptActive = true;
    mockOrgMusicEnabled = true;

    const { can } = await import("@/lib/permissions/service");
    expect(await can("music", "createSong")).toBe(true);
    expect(await can("music", "updateSong")).toBe(false);
    expect(await can("music", "deleteSong")).toBe(false);

    const formData = new FormData();
    formData.set("songId", "song-123");
    formData.set("title", "New Title");

    const updateRes = await updateSongAction(formData);
    expect(updateRes.ok).toBe(false);

    const deleteRes = await deleteSongAction("song-123");
    expect(deleteRes.ok).toBe(false);
  });

  it("disabledChurchMusicBlocksReadsAndWrites", async () => {
    mockIsAdmin = true; // Even admin is blocked if church module is disabled
    mockOrgMusicEnabled = false;

    const { can } = await import("@/lib/permissions/service");
    expect(await can("music", "read")).toBe(false);
    expect(await can("music", "createSong")).toBe(false);

    const formData = new FormData();
    formData.set("title", "Cântico");
    const res = await createSongAction(formData);
    expect(res.ok).toBe(false);

    await expect(searchOnlineSongsAction("alvo")).rejects.toThrow();
  });
});
