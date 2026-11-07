import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { RoleBadge } from "@/components/members/role-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/format";
import {
  personDisplayEmail,
  personDisplayImage,
  personDisplayName,
  type PersonRecord,
} from "@/lib/people";
import { cn } from "@/lib/utils";

export function RecentPeopleCarousel({
  people,
  roleByUserId = new Map(),
}: {
  people: PersonRecord[];
  roleByUserId?: Map<string, string>;
}) {
  if (people.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="recent-people-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id="recent-people-heading"
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Pessoas Recentes
        </h2>
        <Link
          href="/dashboard/members"
          className="group inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver todas as pessoas
          <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:px-0">
        {people.map((person) => {
          const name = personDisplayName(person);
          const email = personDisplayEmail(person);
          const image = personDisplayImage(person);
          const role = person.userId ? roleByUserId.get(person.userId) : undefined;

          return (
            <Link
              key={person.id}
              href={`/dashboard/members/${person.id}`}
              className={cn(
                "group min-w-[220px] shrink-0 snap-start rounded-2xl border border-border/70 bg-card p-4 transition-all duration-200",
                "hover:border-primary/40 hover:shadow-sm sm:min-w-0 flex items-center gap-3.5",
              )}
            >
              <Avatar className="size-11 shrink-0 border">
                <AvatarImage src={image ?? undefined} alt={name} />
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {email ?? "Sem email cadastrado"}
                </p>
                <div className="pt-0.5">
                  {role ? (
                    <RoleBadge role={role} />
                  ) : (
                    <Badge variant="outline" className="text-[0.65rem] font-normal py-0">
                      Membro
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
