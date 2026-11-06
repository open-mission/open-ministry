import type { Metadata } from "next";
import { Suspense } from "react";

import { InviteDialog } from "@/components/members/invite-dialog";
import { MembersTable } from "@/components/members/members-table";
import { PendingInvitations } from "@/components/members/pending-invitations";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { requireOrganizationContext } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "Pessoas",
};

export default function MembersPage() {
  return (
    <Suspense fallback={<MembersSkeleton />}>
      <MembersContent />
    </Suspense>
  );
}

async function MembersContent() {
  const { organization, session, isAdmin } = await requireOrganizationContext();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
              Pessoas
            </p>
            <Badge variant="outline" className="font-normal">
              {organization.members.length}
            </Badge>
          </div>
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Sua equipe
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Veja quem faz parte de{" "}
            <span className="font-medium text-foreground">
              {organization.name}
            </span>
            . Administradores também podem convidar novas pessoas.
          </p>
        </div>
        {isAdmin ? <InviteDialog /> : null}
      </header>

      <MembersTable
        members={organization.members}
        currentUserId={session.user.id}
      />

      {isAdmin ? (
        <PendingInvitations invitations={organization.invitations} />
      ) : null}
    </div>
  );
}

function MembersSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
