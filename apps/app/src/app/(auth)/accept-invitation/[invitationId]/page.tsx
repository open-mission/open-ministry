import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ArrowRightIcon,
  ChurchIcon,
  ClockIcon,
  MailIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDate,
  isExpired,
  maskEmail,
  roleLabel,
} from "@/lib/format";
import { findInvitationDetails, findMembership } from "@/lib/invitations";
import { getSession } from "@/lib/session";
import { withRedirect } from "@/lib/redirects";

export const metadata: Metadata = {
  title: "Convite",
};

type InvitationPageProps = {
  params: Promise<{ invitationId: string }>;
};

export default function AcceptInvitationPage({
  params,
}: InvitationPageProps) {
  return (
    <Suspense fallback={<InvitationSkeleton />}>
      <InvitationContent params={params} />
    </Suspense>
  );
}

async function InvitationContent({ params }: InvitationPageProps) {
  await connection();

  const { invitationId } = await params;
  const details = await findInvitationDetails(invitationId);

  if (!details) {
    return <InvalidInvitation />;
  }

  const session = await getSession();
  const invitePath = `/accept-invitation/${details.id}`;
  const isPending =
    details.status === "pending" && !isExpired(details.expiresAt);

  if (!session) {
    if (!isPending) {
      return <InvitationStatusCard details={details} />;
    }

    return (
      <InvitationCard
        details={details}
        title={
          <>
            Você foi convidado para{" "}
            <span className="text-primary">{details.organization.name}</span>
          </>
        }
        description="Entre com o email que recebeu o convite para confirmar sua participação."
      >
        <div className="space-y-3">
          <Button asChild className="h-10 w-full" size="lg">
            <Link href={withRedirect("/login", invitePath)}>
              Entrar para aceitar
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 w-full"
            size="lg"
          >
            <Link href={withRedirect("/signup", invitePath)}>
              Ainda não tenho conta
            </Link>
          </Button>
        </div>
      </InvitationCard>
    );
  }

  const isRecipient =
    session.user.email.toLowerCase() === details.email.toLowerCase();

  if (!isRecipient) {
    return (
      <InvitationCard
        details={details}
        title="Este convite é para outro email"
        description={`O convite foi enviado para ${maskEmail(
          details.email,
        )}, mas você está conectado como ${session.user.email}.`}
      >
        <div className="space-y-3">
          <form action={signOutAction}>
            <input
              type="hidden"
              name="redirectTo"
              value={withRedirect("/login", invitePath)}
            />
            <Button type="submit" className="h-10 w-full" size="lg">
              Sair e usar outra conta
            </Button>
          </form>
          <Button asChild variant="outline" className="h-10 w-full" size="lg">
            <Link href="/dashboard">Ir para meu painel</Link>
          </Button>
        </div>
      </InvitationCard>
    );
  }

  const membership = await findMembership(
    details.organizationId,
    session.user.id,
  );

  if (membership) {
    return (
      <InvitationCard
        details={details}
        title="Você já faz parte desta igreja"
        description={`Sua conta já está vinculada a ${details.organization.name}.`}
      >
        <Button asChild className="h-10 w-full" size="lg">
          <Link href="/dashboard">
            Ir para o painel
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </InvitationCard>
    );
  }

  if (!isPending) {
    return <InvitationStatusCard details={details} />;
  }

  return (
    <InvitationCard
      details={details}
      title={
        <>
          Confirme seu lugar em{" "}
          <span className="text-primary">{details.organization.name}</span>
        </>
      }
      description="Ao aceitar, esta igreja se tornará seu espaço ativo no OpenMinistry."
    >
      <AcceptInvitationForm
        invitationId={details.id}
        needsBirthday={!session.user.birthday}
      />
    </InvitationCard>
  );
}

type InvitationDetails = NonNullable<
  Awaited<ReturnType<typeof findInvitationDetails>>
>;

function InvitationCard({
  details,
  title,
  description,
  children,
}: {
  details: InvitationDetails;
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  const role = details.role ?? "member";

  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ChurchIcon className="size-5" />
        </span>
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Convite
          </p>
          <h1 className="font-heading text-3xl leading-[1.05] tracking-tight text-balance">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <div className="divide-y rounded-xl border bg-card">
        <InfoRow
          icon={ChurchIcon}
          label="Igreja"
          value={details.organization.name}
        />
        <InfoRow
          icon={UserRoundIcon}
          label="Convite de"
          value={details.user?.name ?? "Liderança da igreja"}
        />
        <InfoRow
          icon={ShieldCheckIcon}
          label="Papel"
          value={roleLabel(role)}
        />
        <InfoRow
          icon={MailIcon}
          label="Email"
          value={maskEmail(details.email)}
        />
        <InfoRow
          icon={ClockIcon}
          label="Expira em"
          value={formatDate(details.expiresAt)}
        />
      </div>

      {children}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto min-w-0 truncate text-right font-medium">
        {value}
      </span>
    </div>
  );
}

function InvitationStatusCard({ details }: { details: InvitationDetails }) {
  return (
    <InvitationCard
      details={details}
      title={statusTitle(details.status, details.expiresAt)}
      description={statusDescription(details.status, details.expiresAt)}
    >
      <Button asChild variant="outline" className="h-10 w-full" size="lg">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </InvitationCard>
  );
}

function InvalidInvitation() {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <MailIcon className="size-5" />
        </span>
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Convite
          </p>
          <h1 className="font-heading text-3xl leading-[1.05] tracking-tight">
            Convite não encontrado
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Este link pode ter expirado ou sido cancelado. Peça um novo convite
            para a liderança da sua igreja.
          </p>
        </div>
      </div>

      <Button asChild className="h-10 w-full" size="lg">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}

function statusTitle(status: string, expiresAt: Date): string {
  if (status === "pending" && isExpired(expiresAt)) {
    return "Este convite expirou";
  }

  switch (status) {
    case "accepted":
      return "Este convite já foi aceito";
    case "rejected":
      return "Este convite foi recusado";
    case "canceled":
      return "Este convite foi cancelado";
    default:
      return "Este convite não está mais disponível";
  }
}

function statusDescription(status: string, expiresAt: Date): string {
  if (status === "pending" && isExpired(expiresAt)) {
    return `O prazo terminou em ${formatDate(expiresAt)}. Solicite um novo convite para entrar na igreja.`;
  }

  return "Se precisar de acesso, peça à liderança da igreja que gere um novo convite.";
}

function InvitationSkeleton() {
  return (
    <div className="space-y-7" aria-hidden>
      <div className="space-y-3">
        <Skeleton className="size-11 rounded-xl" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
