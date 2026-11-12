import { ClockIcon, MailIcon } from "lucide-react";

import { CancelInvitationButton } from "@/components/members/cancel-invitation-button";
import { CopyInvitationLink } from "@/components/members/copy-invitation-link";
import { ResendInvitationButton } from "@/components/members/resend-invitation-button";
import { WhatsAppInvitationDialog } from "@/components/members/whatsapp-invitation-dialog";
import { RoleBadge } from "@/components/members/role-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, isExpired } from "@/lib/format";
import type { OrganizationContext } from "@/lib/organizations";

type Invitation = OrganizationContext["organization"]["invitations"][number];

export function PendingInvitations({
  invitations,
}: {
  invitations: Invitation[];
}) {
  const pending = invitations
    .filter((invitation) => invitation.status === "pending")
    .sort(
      (a, b) =>
        new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
    );

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="font-heading text-xl tracking-tight">
          Convites pendentes
        </CardTitle>
        <CardDescription>
          Compartilhe o link com a pessoa. O convite expira em 7 dias.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {pending.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MailIcon className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium">Nenhum convite pendente</p>
              <p className="text-xs text-muted-foreground">
                Use o botão “Convidar pessoa” para gerar um novo link.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="divide-y divide-border/60 md:hidden">
              {pending.map((invitation) => {
                const expired = isExpired(invitation.expiresAt);

                return (
                  <div key={invitation.id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {invitation.email}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <RoleBadge role={invitation.role ?? "member"} />
                          {expired ? (
                            <Badge variant="destructive" className="font-normal text-[11px]">
                              Expirado
                            </Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <ClockIcon className="size-3" />
                              Expira em {formatDate(invitation.expiresAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/40">
                      {expired ? (
                        <ResendInvitationButton invitationId={invitation.id} />
                      ) : (
                        <>
                          <WhatsAppInvitationDialog
                            invitationId={invitation.id}
                            email={invitation.email}
                          />
                          <CopyInvitationLink invitationId={invitation.id} />
                        </>
                      )}
                      <CancelInvitationButton
                        invitationId={invitation.id}
                        email={invitation.email}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((invitation) => {
                    const expired = isExpired(invitation.expiresAt);

                    return (
                      <TableRow key={invitation.id}>
                        <TableCell className="max-w-64 truncate text-sm">
                          {invitation.email}
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={invitation.role ?? "member"} />
                        </TableCell>
                        <TableCell>
                          {expired ? (
                            <Badge variant="destructive" className="font-normal">
                              Expirado
                            </Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground">
                              <ClockIcon className="size-3.5" />
                              {formatDate(invitation.expiresAt)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            {expired ? (
                              <ResendInvitationButton invitationId={invitation.id} />
                            ) : (
                              <>
                                <WhatsAppInvitationDialog
                                  invitationId={invitation.id}
                                  email={invitation.email}
                                />
                                <CopyInvitationLink invitationId={invitation.id} />
                              </>
                            )}
                            <CancelInvitationButton
                              invitationId={invitation.id}
                              email={invitation.email}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
