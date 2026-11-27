import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { DepartmentCard } from "@/components/departments/department-card";
import {
  HomeSection,
  HomeSectionAction,
  HomeSectionHeader,
  HomeSectionTitle,
} from "@/components/home/home-section";
import { Button } from "@/components/ui/button";
import type { PersonLike } from "@/lib/person-format";

export type ServedDepartment = {
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
            className="h-9 min-h-11 px-2 text-xs text-primary hover:text-primary"
          >
            <Link href="/departments">
              Gerenciar
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </HomeSectionAction>
      </HomeSectionHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        {departments.map((department) => (
          <DepartmentCard key={department.id} department={department} />
        ))}
      </div>
    </HomeSection>
  );
}
