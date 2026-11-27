import { serve } from "@upstash/workflow/nextjs";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { runInBatches } from "@/app/actions/notifications/shared";
import {
  dispatchNotification,
  getOrganizationEvolutionConfig,
} from "@/lib/notification-service";
import { sendWebPushToUser } from "@/lib/push-notifications";
import type { AnnouncementWorkflowPayload } from "@/lib/workflows/client";
import { authorizeWorkflowRequest } from "@/lib/workflows/client";

type Recipient = {
  id: string;
  userId: string | null;
  phone: string | null;
  email: string | null;
  name: string | null;
};

type Resolved = { recipients: Recipient[]; churchName: string };

async function resolveRecipients(
  payload: AnnouncementWorkflowPayload,
): Promise<Resolved> {
  const organization = await db.query.organization.findFirst({
    where: eq(schema.organization.id, payload.organizationId),
    columns: { name: true },
  });

  const toRecipient = (
    person: typeof schema.person.$inferSelect & {
      user?: { email: string | null } | null;
    },
  ): Recipient => ({
    id: person.id,
    userId: person.userId,
    phone: person.phone,
    email: person.email || person.user?.email || null,
    name: person.name,
  });

  if (payload.targetType === "person" && payload.personId) {
    const person = await db.query.person.findFirst({
      where: and(
        eq(schema.person.id, payload.personId),
        eq(schema.person.organizationId, payload.organizationId),
      ),
      with: { user: { columns: { email: true } } },
    });
    return {
      churchName: organization?.name ?? "Igreja",
      recipients: person ? [toRecipient(person)] : [],
    };
  }

  if (payload.targetType === "department" && payload.departmentId) {
    const members = await db.query.departmentMember.findMany({
      where: eq(schema.departmentMember.departmentId, payload.departmentId),
      with: {
        person: { with: { user: { columns: { email: true } } } },
      },
    });
    return {
      churchName: organization?.name ?? "Igreja",
      recipients: members
        .filter((member) => member.person.userId !== payload.actorId)
        .map((member) => toRecipient(member.person)),
    };
  }

  const people = await db.query.person.findMany({
    where: eq(schema.person.organizationId, payload.organizationId),
    with: { user: { columns: { email: true } } },
    limit: 2000,
  });
  return {
    churchName: organization?.name ?? "Igreja",
    recipients: people
      .filter((person) => person.userId !== payload.actorId)
      .map(toRecipient),
  };
}

const workflow = serve<AnnouncementWorkflowPayload>(
  async (context) => {
    const payload = context.requestPayload;

    const resolved = await context.run("resolve-recipients", () =>
      resolveRecipients(payload),
    );

    if (payload.sendWhatsApp) {
      await context.run("dispatch-whatsapp", async () => {
        const { config } = await getOrganizationEvolutionConfig(
          payload.organizationId,
        );
        if (!config) return 0;

        const withPhone = resolved.recipients.filter((recipient) =>
          Boolean(recipient.phone),
        );
        const outcome = await runInBatches(withPhone, (recipient) =>
          dispatchNotification({
            organizationId: payload.organizationId,
            type: "announcement",
            title: payload.title,
            body: payload.body,
            href: "/notifications",
            actorId: payload.actorId,
            userId: recipient.userId,
            personId: recipient.id,
            phone: recipient.phone,
            email: recipient.email,
            name: recipient.name,
            batchId: payload.announcementBatchId,
            channels: ["whatsapp"],
            metadata: { churchName: resolved.churchName },
          }),
        );
        return outcome.fulfilled;
      });
    }

    if (payload.sendEmail) {
      await context.run("dispatch-email", async () => {
        const withEmail = resolved.recipients.filter((recipient) =>
          Boolean(recipient.email),
        );
        const outcome = await runInBatches(withEmail, (recipient) =>
          dispatchNotification({
            organizationId: payload.organizationId,
            type: "announcement",
            title: payload.title,
            body: payload.body,
            href: "/notifications",
            actorId: payload.actorId,
            userId: recipient.userId,
            personId: recipient.id,
            phone: recipient.phone,
            email: recipient.email,
            name: recipient.name,
            batchId: payload.announcementBatchId,
            channels: ["email"],
            metadata: {
              churchName: resolved.churchName,
            },
          }),
        );
        return outcome.fulfilled;
      });
    }

    if (payload.sendPush) {
      await context.run("dispatch-web-push", async () => {
        const userIds = [
          ...new Set(
            resolved.recipients
              .map((recipient) => recipient.userId)
              .filter((userId): userId is string => Boolean(userId)),
          ),
        ];

        let sent = 0;
        for (let start = 0; start < userIds.length; start += 10) {
          const settled = await Promise.allSettled(
            userIds.slice(start, start + 10).map((userId) =>
              sendWebPushToUser(userId, {
                title: payload.title,
                body: payload.body,
                url: "/notifications",
              }),
            ),
          );
          sent += settled.filter((result) => result.status === "fulfilled").length;
        }
        return sent;
      });
    }

    await context.run("complete-job", async () => {
      await db
        .update(schema.backgroundJob)
        .set({
          status: "completed",
          progress: 100,
          completedAt: new Date(),
          result: { recipients: resolved.recipients.length },
        })
        .where(eq(schema.backgroundJob.id, payload.jobId));
      return { jobId: payload.jobId };
    });
  },
  {
    failureFunction: async ({ context, failStatus, failResponse }) => {
      const jobId = context.requestPayload?.jobId;
      if (!jobId) return;

      await db
        .update(schema.backgroundJob)
        .set({
          status: "failed",
          error: `${failStatus}: ${failResponse}`.slice(0, 500),
          completedAt: new Date(),
        })
        .where(eq(schema.backgroundJob.id, jobId));
    },
  },
);

export async function POST(request: Request) {
  if (!(await authorizeWorkflowRequest(request))) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }
  return workflow.POST(request);
}
