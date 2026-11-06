import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { formatDate, getInitials } from "@/lib/format";
import type { OrganizationContext } from "@/lib/organizations";
import { RoleBadge } from "@/components/members/role-badge";

type MemberWithUser = OrganizationContext["organization"]["members"][number];

function memberWeight(role: string) {
  if (role.includes("owner")) return 0;
  if (role.includes("admin")) return 1;
  return 2;
}

function sortMembers(members: MemberWithUser[]) {
  return [...members].sort((a, b) => {
    const weightA = memberWeight(a.role);
    const weightB = memberWeight(b.role);

    if (weightA !== weightB) {
      return weightA - weightB;
    }

    return a.user.name.localeCompare(b.user.name, "pt-BR");
  });
}

export function MembersTable({
  members,
  currentUserId,
}: {
  members: MemberWithUser[];
  currentUserId: string;
}) {
  const ordered = sortMembers(members);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="font-heading text-xl tracking-tight">
          Equipe da igreja
        </CardTitle>
        <CardDescription>
          {members.length === 1
            ? "1 pessoa faz parte da igreja."
            : `${members.length} pessoas fazem parte da igreja.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-right">Desde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex min-w-52 items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarImage
                          src={member.user.image ?? undefined}
                          alt={member.user.name}
                        />
                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                          {getInitials(member.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {member.user.name}
                          {member.userId === currentUserId ? (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              (você)
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                  <TableCell className="text-right text-sm whitespace-nowrap text-muted-foreground">
                    {formatDate(member.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
