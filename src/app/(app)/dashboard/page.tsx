import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  CircleDashedIcon,
  MailIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

import { InviteDialog } from "@/components/members/invite-dialog";
import { RoleBadge } from "@/components/members/role-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials, isAdminRole } from "@/lib/format";
import { requireOrganizationContext } from "@/lib/organizations";

export const metadata: Metadata = {
  title: "Visão geral",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const { organization, session, isAdmin } = await requireOrganizationContext();

  const members = organization.members;
  const pendingInvitations = organization.invitations.filter(
    (invitation) => invitation.status === "pending",
  );
  const admins = members.filter((member) => isAdminRole(member.role));
  const firstName = session.user.name.trim().split(/\s+/)[0] ?? "líder";
  const recentMembers = [...members]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 4);

  const hasTeam = members.length > 1 || pendingInvitations.length > 0;
  const hasAdminTeam = admins.length > 1;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Visão geral
          </p>
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Olá, {firstName}.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Aqui está o panorama de{" "}
            <span className="font-medium text-foreground">
              {organization.name}
            </span>{" "}
            hoje.
          </p>
        </div>
        {isAdmin ? <InviteDialog /> : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={UsersIcon}
          label="Pessoas"
          value={members.length}
          hint="fazem parte da igreja"
        />
        <StatCard
          icon={MailIcon}
          label="Convites pendentes"
          value={pendingInvitations.length}
          hint="aguardando resposta"
        />
        <StatCard
          icon={ShieldCheckIcon}
          label="Administradores"
          value={admins.length}
          hint="cuidando da equipe"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl tracking-tight">
              Próximos passos
            </CardTitle>
            <CardDescription>
              Um caminho simples para colocar a igreja em movimento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1">
              <StepItem
                done
                title="Crie o espaço da sua igreja"
                description="O primeiro passo está concluído."
              />
              <StepItem
                done={hasTeam}
                title="Convide sua equipe"
                description={
                  hasTeam
                    ? "Novas pessoas já estão a caminho."
                    : "Gere um link e compartilhe com a liderança."
                }
              />
              <StepItem
                done={hasAdminTeam}
                title="Defina quem administra"
                description={
                  hasAdminTeam
                    ? "Sua igreja tem mais de um administrador."
                    : "Convide alguém de confiança como administrador."
                }
              />
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl tracking-tight">
              Equipe recente
            </CardTitle>
            <CardDescription>
              As pessoas que chegaram por último.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
              >
                <Avatar className="size-9">
                  <AvatarImage
                    src={member.user.image ?? undefined}
                    alt={member.user.name}
                  />
                  <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.user.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
                <RoleBadge role={member.role} />
              </div>
            ))}

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mt-2 w-full justify-between"
            >
              <Link href="/dashboard/members">
                Ver todas as pessoas
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="space-y-0.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-heading text-3xl leading-none tracking-tight">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StepItem({
  done,
  title,
  description,
}: {
  done: boolean;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-3 rounded-lg p-2">
      <span
        className={
          done
            ? "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            : "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground"
        }
      >
        {done ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CircleDashedIcon className="size-3.5" />
        )}
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
