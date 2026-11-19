import Link from "next/link";
import { ArrowRightIcon, UsersIcon } from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import {
  HomeSection,
  HomeSectionAction,
  HomeSectionHeader,
  HomeSectionTitle,
} from "@/components/home/home-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/format";

export type ServedDepartment = {
  id: string;
  name: string;
  description: string | null;
  functions: string[];
  memberCount: number;
  memberAvatars: { id: string; name: string; image: string | null }[];
};

/** Sigla curta e legível usada como identidade visual do departamento. */
export function departmentAcronym(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => word.length > 2);
  if (words.length === 0) return "–";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

const VISIBLE_FUNCTIONS = 3;

export function DepartmentsCard({
  departments,
  pluralLabel = "Departamentos",
}: {
  departments: ServedDepartment[];
  pluralLabel?: string;
}) {
  if (departments.length === 0) {
    return null;
  }

  return (
    <HomeSection aria-labelledby="home-departments-title">
      <HomeSectionHeader>
        <HomeSectionTitle id="home-departments-title">
          {pluralLabel} que sirvo
        </HomeSectionTitle>
        <HomeSectionAction>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 min-h-[44px] px-2 text-xs text-primary hover:text-primary"
          >
            <Link href="/dashboard/departments">
              Gerenciar
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </HomeSectionAction>
      </HomeSectionHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {departments.map((department) => {
          const visible = department.functions.slice(0, VISIBLE_FUNCTIONS);
          const extra = department.functions.length - visible.length;

          return (
            <HomeCard key={department.id}>
              <HomeCardContent className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-heading text-sm font-semibold text-primary">
                    {departmentAcronym(department.name)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="truncate font-heading text-base font-medium tracking-tight text-foreground">
                      {department.name}
                    </h3>
                    {department.description ? (
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {department.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                {department.functions.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {visible.map((fn) => (
                      <Badge
                        key={fn}
                        variant="secondary"
                        className="text-[11px] font-normal"
                      >
                        {fn}
                      </Badge>
                    ))}
                    {extra > 0 ? (
                      <Badge
                        variant="outline"
                        className="text-[11px] font-normal text-muted-foreground"
                      >
                        +{extra}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                  <div className="flex -space-x-2">
                    {department.memberAvatars.slice(0, 4).map((member) => (
                      <Avatar
                        key={member.id}
                        className="size-7 border-2 border-card"
                      >
                        <AvatarImage
                          src={member.image ?? undefined}
                          alt={member.name}
                        />
                        <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UsersIcon className="size-3.5" aria-hidden="true" />
                    <span className="tabular-nums">
                      {department.memberCount}{" "}
                      {department.memberCount === 1 ? "pessoa" : "pessoas"}
                    </span>
                  </span>
                </div>
              </HomeCardContent>
            </HomeCard>
          );
        })}
      </div>
    </HomeSection>
  );
}
