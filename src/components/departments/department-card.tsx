import Link from "next/link";
import { ArrowUpRightIcon, CrownIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import {
  personDisplayImage,
  personDisplayName,
  type PersonLike,
} from "@/lib/person-format";

type DepartmentSummary = {
  id: string;
  name: string;
  description: string | null;
  functions: { id: string; name: string }[];
  members: {
    id: string;
    isLeader: boolean;
    person: PersonLike;
  }[];
};

export function DepartmentCard({
  department,
}: {
  department: DepartmentSummary;
}) {
  const leaders = department.members.filter((member) => member.isLeader);
  const visibleFunctions = department.functions.slice(0, 3);
  const extraFunctions = department.functions.length - visibleFunctions.length;

  return (
    <Link
      href={`/dashboard/departments/${department.id}`}
      className="group relative flex h-full flex-col justify-between gap-5 overflow-hidden rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 hover:ring-primary/25 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-3 right-4 font-heading text-7xl leading-none text-primary/10 select-none"
      >
        {department.name.slice(0, 1).toUpperCase()}
      </span>

      <div className="relative space-y-3">
        <div className="space-y-1.5">
          <h2 className="font-heading text-2xl leading-tight tracking-tight text-balance">
            {department.name}
          </h2>
          <p className="line-clamp-2 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
            {department.description ?? "Sem descrição por enquanto."}
          </p>
        </div>

        {department.functions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {visibleFunctions.map((fn) => (
              <span
                key={fn.id}
                className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {fn.name}
              </span>
            ))}
            {extraFunctions > 0 ? (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                +{extraFunctions}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhuma função cadastrada ainda.
          </p>
        )}
      </div>

      <div className="relative flex items-end justify-between gap-4 border-t pt-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {department.members.slice(0, 4).map((member) => (
              <Avatar
                key={member.id}
                className="size-7 ring-2 ring-card"
                title={personDisplayName(member.person)}
              >
                <AvatarImage
                  src={personDisplayImage(member.person) ?? undefined}
                  alt={personDisplayName(member.person)}
                />
                <AvatarFallback className="bg-primary/10 text-[0.6rem] font-medium text-primary">
                  {getInitials(personDisplayName(member.person))}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {department.members.length === 0
              ? "Ninguém ainda"
              : department.members.length === 1
                ? "1 pessoa"
                : `${department.members.length} pessoas`}
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <CrownIcon className="size-3.5 shrink-0 text-accent-foreground" />
          <span className="truncate">
            {leaders.length === 0
              ? "Sem líder definido"
              : leaders
                  .map((leader) => personDisplayName(leader.person))
                  .join(", ")}
          </span>
        </div>

        <ArrowUpRightIcon className="size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}
