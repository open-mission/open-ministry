import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowRightIcon, ChurchIcon } from "lucide-react";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { setActiveOrganizationAction } from "@/app/actions/organization";
import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { Button } from "@/components/ui/button";
import { isExpired, roleLabel } from "@/lib/format";
import {
  getOrganizationContext,
  listUserMemberships,
} from "@/lib/organizations";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sua igreja",
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <OnboardingContent />
    </Suspense>
  );
}

async function OnboardingContent() {
  await connection();

  const session = await requireSession();
  const context = await getOrganizationContext();

  if (context) {
    redirect("/dashboard");
  }

  const memberships = await listUserMemberships(session.user.id);

  if (memberships.length > 0) {
    return <ChooseChurch memberships={memberships} />;
  }

  const userEmail = session.user.email?.toLowerCase().trim();
  const pendingInvitations = userEmail
    ? await db.query.invitation.findMany({
        where: and(
          eq(schema.invitation.email, userEmail),
          eq(schema.invitation.status, "pending"),
        ),
        with: {
          organization: true,
        },
      })
    : [];

  const activeInvitations = pendingInvitations.filter(
    (inv) => !isExpired(inv.expiresAt),
  );

  if (activeInvitations.length > 0) {
    return (
      <PendingInvitationsOnboarding
        invitations={activeInvitations}
        needsBirthday={!session.user.birthday}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
          Quase lá
        </p>
        <h1 className="font-heading text-4xl leading-none tracking-tight">
          Dê um nome à sua igreja
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Este será o espaço da sua comunidade no OpenMinistry. Você poderá
          ajustar o nome mais tarde.
        </p>
      </div>

      <OnboardingForm needsBirthday={!session.user.birthday} />
    </div>
  );
}

function ChooseChurch({
  memberships,
}: {
  memberships: Awaited<ReturnType<typeof listUserMemberships>>;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
          Bem-vindo de volta
        </p>
        <h1 className="font-heading text-4xl leading-none tracking-tight">
          Escolha sua igreja
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Você já faz parte de mais de um espaço. Selecione onde quer continuar
          agora.
        </p>
      </div>

      <div className="space-y-3">
        {memberships.map((membership) => (
          <form
            key={membership.id}
            action={setActiveOrganizationAction}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-accent/30"
          >
            <input
              type="hidden"
              name="organizationId"
              value={membership.organizationId}
            />
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ChurchIcon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {membership.organization.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                {roleLabel(membership.role)}
              </span>
            </span>
            <Button type="submit" variant="outline" size="sm">
              Acessar
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </form>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Precisa de outro espaço?{" "}
        <Link href="/" className="font-medium text-foreground underline underline-offset-4">
          Fale com sua liderança
        </Link>
        .
      </p>
    </div>
  );
}

function PendingInvitationsOnboarding({
  invitations,
  needsBirthday,
}: {
  invitations: Array<{
    id: string;
    role: string | null;
    organization: {
      name: string;
    };
  }>;
  needsBirthday: boolean;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
          Convite encontrado
        </p>
        <h1 className="font-heading text-4xl leading-none tracking-tight">
          Você foi convidado!
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Encontramos um convite para você participar de uma igreja no
          OpenMinistry. Confirme sua participação para entrar no espaço.
        </p>
      </div>

      <div className="space-y-3">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ChurchIcon className="size-5" />
              </span>
              <div>
                <p className="font-heading text-lg font-bold leading-tight">
                  {inv.organization.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Papel: {roleLabel(inv.role ?? "member")}
                </p>
              </div>
            </div>

            <Button asChild size="default" className="gap-2 shrink-0">
              <Link href={`/accept-invitation/${inv.id}`}>
                Aceitar convite
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-6 pt-6 border-t border-border/60">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Ou crie uma nova comunidade
          </p>
          <p className="text-xs text-muted-foreground">
            Se preferir cadastrar sua própria igreja agora:
          </p>
        </div>
        <OnboardingForm needsBirthday={needsBirthday} />
      </div>
    </div>
  );
}
