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
    <section aria-labelledby="recent-people-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2
          id="recent-people-heading"
          className="font-heading text-lg leading-none tracking-tight sm:text-xl"
        >
          Pessoas recentes
        </h2>
        <Link
          href="/dashboard/members"
          className="group inline-flex items-center gap-1 pb-0.5 text-xs font-medium text-primary hover:underline"
        >
          Ver todas as pessoas
          <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1.5 pt-0.5 snap-x snap-mandatory scroll-pl-4 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
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
                "group flex min-w-[240px] shrink-0 snap-start items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-4",
                "transition-[transform,border-color,box-shadow] duration-150 active:scale-[0.99] hover:border-primary/35 hover:shadow-sm sm:min-w-0",
                "motion-reduce:transition-none motion-reduce:active:scale-100",
              )}
            >
              <Avatar className="size-11 shrink-0 border">
                <AvatarImage src={image ?? undefined} alt={name} />
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                  {name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {email ?? "Sem email cadastrado"}
                </p>
                <div className="pt-0.5">
                  {role ? (
                    <RoleBadge role={role} />
                  ) : (
                    <Badge variant="outline" className="py-0 text-[0.65rem] font-normal">
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
