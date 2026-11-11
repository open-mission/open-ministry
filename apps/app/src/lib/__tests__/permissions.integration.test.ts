import { afterAll, beforeAll, describe, expect, it } from "bun:test";

const testDbUrl = process.env.TEST_DATABASE_URL;

describe("Permissions Integration (Disposable Database)", () => {
  if (!testDbUrl) {
    it.skip("skipped: TEST_DATABASE_URL is not defined (never touches production DB)", () => {
      console.log(
        "INFO: Skipping live database integration tests because TEST_DATABASE_URL is not provided.",
      );
    });
    return;
  }

  // Set DATABASE_URL to testDbUrl BEFORE importing db
  process.env.DATABASE_URL = testDbUrl;

  let db: any;
  let schema: any;
  let evaluatePermission: any;
  let seedOrganizationPermissions: any;
  let seedDepartmentModules: any;

  const testSuffix = `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const testOrg1Id = `org1_${testSuffix}`;
  const testOrg2Id = `org2_${testSuffix}`;
  const testDept1Id = `dept1_${testSuffix}`;
  const testUserId = `user_${testSuffix}`;
  const testPersonId = `person_${testSuffix}`;

  beforeAll(async () => {
    // Dynamic import after assigning DATABASE_URL
    const dbModule = await import("@/db");
    const schemaModule = await import("@/db/schema");
    const evaluatorModule = await import("@/lib/permissions/evaluator");
    const provisioningModule = await import("@/lib/permissions/provisioning");

    db = dbModule.db;
    schema = schemaModule;
    evaluatePermission = evaluatorModule.evaluatePermission;
    seedOrganizationPermissions = provisioningModule.seedOrganizationPermissions;
    seedDepartmentModules = provisioningModule.seedDepartmentModules;

    // Create test fixtures
    await db.insert(schema.organization).values([
      { id: testOrg1Id, name: `Org 1 ${testSuffix}`, slug: `org-1-${testSuffix}` },
      { id: testOrg2Id, name: `Org 2 ${testSuffix}`, slug: `org-2-${testSuffix}` },
    ]);

    await db.insert(schema.user).values({
      id: testUserId,
      name: `User ${testSuffix}`,
      email: `${testSuffix}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(schema.person).values({
      id: testPersonId,
      organizationId: testOrg1Id,
      userId: testUserId,
      name: `Person ${testSuffix}`,
    });

    await db.insert(schema.department).values({
      id: testDept1Id,
      organizationId: testOrg1Id,
      name: `Louvor ${testSuffix}`,
    });

    await db.insert(schema.departmentMember).values({
      departmentId: testDept1Id,
      personId: testPersonId,
      isLeader: true,
    });
  });

  afterAll(async () => {
    if (!db || !schema) return;
    try {
      await db.delete(schema.departmentPermissionGrant).where(
        schema.eq(schema.departmentPermissionGrant.organizationId, testOrg1Id),
      );
      await db.delete(schema.departmentModule).where(
        schema.eq(schema.departmentModule.departmentId, testDept1Id),
      );
      await db.delete(schema.departmentMember).where(
        schema.eq(schema.departmentMember.departmentId, testDept1Id),
      );
      await db.delete(schema.department).where(
        schema.eq(schema.department.id, testDept1Id),
      );
      await db.delete(schema.person).where(
        schema.eq(schema.person.id, testPersonId),
      );
      await db.delete(schema.organizationModule).where(
        schema.or(
          schema.eq(schema.organizationModule.organizationId, testOrg1Id),
          schema.eq(schema.organizationModule.organizationId, testOrg2Id),
        ),
      );
      await db.delete(schema.organizationPermissionPolicy).where(
        schema.or(
          schema.eq(schema.organizationPermissionPolicy.organizationId, testOrg1Id),
          schema.eq(schema.organizationPermissionPolicy.organizationId, testOrg2Id),
        ),
      );
      await db.delete(schema.organization).where(
        schema.or(
          schema.eq(schema.organization.id, testOrg1Id),
          schema.eq(schema.organization.id, testOrg2Id),
        ),
      );
      await db.delete(schema.user).where(schema.eq(schema.user.id, testUserId));
    } catch (err) {
      console.warn("Cleanup warning in integration test:", err);
    }
  });

  it("seeds organization modules idempotently", async () => {
    await seedOrganizationPermissions(testOrg1Id);
    const firstModules = await db.query.organizationModule.findMany({
      where: schema.eq(schema.organizationModule.organizationId, testOrg1Id),
    });
    expect(firstModules.length).toBeGreaterThanOrEqual(4);

    // Second seeding should not duplicate
    await seedOrganizationPermissions(testOrg1Id);
    const secondModules = await db.query.organizationModule.findMany({
      where: schema.eq(schema.organizationModule.organizationId, testOrg1Id),
    });
    expect(secondModules.length).toBe(firstModules.length);
  });

  it("seeds department modules idempotently", async () => {
    await seedDepartmentModules(testOrg1Id, testDept1Id);
    const firstDeptModules = await db.query.departmentModule.findMany({
      where: schema.eq(schema.departmentModule.departmentId, testDept1Id),
    });
    // agenda, schedules, announcements should be active
    const moduleKeys = firstDeptModules.map((m: any) => m.moduleKey);
    expect(moduleKeys).toContain("agenda");
    expect(moduleKeys).toContain("schedules");
    expect(moduleKeys).toContain("announcements");

    // Second run should be idempotent
    await seedDepartmentModules(testOrg1Id, testDept1Id);
    const secondDeptModules = await db.query.departmentModule.findMany({
      where: schema.eq(schema.departmentModule.departmentId, testDept1Id),
    });
    expect(secondDeptModules.length).toBe(firstDeptModules.length);
  });

  it("respects organization level disablement over department level", async () => {
    // Disable schedules at church level
    await db
      .update(schema.organizationModule)
      .set({ enabled: false })
      .where(
        schema.and(
          schema.eq(schema.organizationModule.organizationId, testOrg1Id),
          schema.eq(schema.organizationModule.moduleKey, "schedules"),
        ),
      );

    const allowed = evaluatePermission({
      moduleKey: "schedules",
      action: "read",
      isOrganizationModuleEnabled: false,
      userRole: "admin",
      userId: testUserId,
      policy: {
        admin: { schedules: { read: true } },
        leader: { schedules: { read: true } },
        member: { schedules: { read: true } },
      } as any,
    });

    expect(allowed).toBe(false);
  });

  it("applies and revokes individual department grants immediately", async () => {
    // Insert active grant
    const [grant] = await db
      .insert(schema.departmentPermissionGrant)
      .values({
        organizationId: testOrg1Id,
        departmentId: testDept1Id,
        granteeUserId: testUserId,
        moduleKey: "music",
        action: "createSong",
        grantedByUserId: testUserId,
      })
      .returning();

    expect(grant.id).toBeDefined();
    expect(grant.revokedAt).toBeNull();

    // Revoke grant
    await db
      .update(schema.departmentPermissionGrant)
      .set({
        revokedAt: new Date(),
        revokedByUserId: testUserId,
      })
      .where(schema.eq(schema.departmentPermissionGrant.id, grant.id));

    const updated = await db.query.departmentPermissionGrant.findFirst({
      where: schema.eq(schema.departmentPermissionGrant.id, grant.id),
    });
    expect(updated.revokedAt).toBeDefined();
    expect(updated.revokedAt).not.toBeNull();
  });
});
