import { and, eq } from "drizzle-orm";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/format";

const f = createUploadthing();

async function requireSession(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    throw new UploadThingError("Faça login para enviar imagens.");
  }

  return session;
}

const profileImage = f({
  image: { maxFileSize: "2MB", maxFileCount: 1 },
})
  .middleware(async ({ req }) => {
    const session = await requireSession(req);

    return { userId: session.user.id };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    return { uploadedBy: metadata.userId, url: file.ufsUrl };
  });

const churchLogo = f({
  image: { maxFileSize: "2MB", maxFileCount: 1 },
})
  .middleware(async ({ req }) => {
    const session = await requireSession(req);
    const organizationId = session.session.activeOrganizationId;

    if (!organizationId) {
      throw new UploadThingError("Selecione uma igreja antes de enviar.");
    }

    const membership = await db.query.member.findFirst({
      where: and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.member.userId, session.user.id),
      ),
      columns: { role: true },
    });

    if (!membership || !isAdminRole(membership.role)) {
      throw new UploadThingError(
        "Só administradores podem enviar o logo da igreja.",
      );
    }

    return { userId: session.user.id, organizationId };
  })
  .onUploadComplete(async ({ metadata, file }) => {
    return {
      uploadedBy: metadata.userId,
      organizationId: metadata.organizationId,
      url: file.ufsUrl,
    };
  });

export const ourFileRouter = {
  profileImage,
  churchLogo,
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
