import { ClockIcon, MailIcon } from "lucide-react";

import { CancelInvitationButton } from "@/components/members/cancel-invitation-button";
import { CopyInvitationLink } from "@/components/members/copy-invitation-link";
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
          <div className="overflow-x-auto">
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
                          <WhatsAppInvitationDialog
                            invitationId={invitation.id}
                            email={invitation.email}
                          />
                          <CopyInvitationLink invitationId={invitation.id} />
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
        )}
      </CardContent>
    </Card>
  );
}
