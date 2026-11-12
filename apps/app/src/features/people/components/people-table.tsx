"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRightIcon,
  ClockIcon,
  CrownIcon,
  HeartHandshakeIcon,
  MessageSquareHeartIcon,
  SearchIcon,
  SmartphoneIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";

import { RoleBadge } from "@/components/members/role-badge";
import { PersonActionsDropdown } from "@/features/people/components/person-actions-dropdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatOwnBirthday } from "@/lib/birthdays";
import type { DepartmentNomenclature } from "@/lib/church";
import { getInitials } from "@/lib/format";
import {
  personDisplayBirthday,
  personDisplayEmail,
  personDisplayImage,
  personDisplayName,
} from "@/lib/person-format";
import type { PersonRecord } from "@/lib/people";

type LinkableMember = {
  id: string;
  name: string;
  email: string;
};

type CareInfo = {
  needsPrayer: boolean;
  needsTalk: boolean;
  date: string;
};

export function PeopleTable({
  people,
  roleByUserId,
  linkableMembers,
  isAdmin,
  currentUserId,
  terminology,
  pendingInvitationEmails,
  careByPersonId,
}: {
  people: PersonRecord[];
  roleByUserId: Record<string, string>;
  linkableMembers: LinkableMember[];
  isAdmin: boolean;
  currentUserId: string;
  terminology?: DepartmentNomenclature;
  pendingInvitationEmails?: Set<string>;
  careByPersonId?: Record<string, CareInfo>;
}) {
  const groupWord = terminology?.plural.toLowerCase() ?? "departamentos";
  const possessive =
    terminology?.type === "teams" || terminology?.type === "networks"
      ? "suas"
      : "seus";
  const preposition = possessive === "suas" ? "das" : "dos";
  const scopeBadgeLabel = `${possessive.charAt(0).toUpperCase() + possessive.slice(1)} ${groupWord}`;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "account" | "no-account" | "pending" | "care"
  >("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of people) {
      for (const m of p.memberships) {
        map.set(m.department.id, m.department.name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [people]);

  // Status counts
  const counts = useMemo(() => {
    let withAccount = 0;
    let withoutAccount = 0;
    let pendingInvite = 0;
    let careCount = 0;

    for (const p of people) {
      const email = personDisplayEmail(p)?.toLowerCase();
      const role = p.userId ? roleByUserId[p.userId] : undefined;
      const isPending = Boolean(!role && email && pendingInvitationEmails?.has(email));
      const hasCare = Boolean(careByPersonId && careByPersonId[p.id]);

      if (p.userId) withAccount++;
      else withoutAccount++;

      if (isPending) pendingInvite++;
      if (hasCare) careCount++;
    }

    return {
      all: people.length,
      account: withAccount,
      noAccount: withoutAccount,
      pending: pendingInvite,
      care: careCount,
    };
  }, [people, roleByUserId, pendingInvitationEmails, careByPersonId]);

  // Filtered people
  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();

    return people.filter((person) => {
      const name = personDisplayName(person).toLowerCase();
      const email = personDisplayEmail(person)?.toLowerCase() ?? "";
      const phone = person.phone ?? "";
      const role = person.userId ? roleByUserId[person.userId] : undefined;
      const isPending = Boolean(!role && email && pendingInvitationEmails?.has(email));
      const care = careByPersonId?.[person.id];

      // Text search
      if (q) {
        const matchesName = name.includes(q);
        const matchesEmail = email.includes(q);
        const matchesPhone = phone.includes(q);
        const matchesDept = person.memberships.some((m) =>
          m.department.name.toLowerCase().includes(q),
        );
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesDept) {
          return false;
        }
      }

      // Department filter
      if (
        selectedDepartment !== "all" &&
        !person.memberships.some((m) => m.department.id === selectedDepartment)
      ) {
        return false;
      }

      // Status filter
      if (statusFilter === "account" && !person.userId) return false;
      if (statusFilter === "no-account" && person.userId) return false;
      if (statusFilter === "pending" && !isPending) return false;
      if (statusFilter === "care" && !care) return false;

      return true;
    });
  }, [
    people,
    search,
    statusFilter,
    selectedDepartment,
    roleByUserId,
    pendingInvitationEmails,
    careByPersonId,
  ]);

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("all");
    setSelectedDepartment("all");
  }

  return (
    <Card className="overflow-hidden border-border/70 shadow-xs">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CardTitle className="font-heading text-xl tracking-tight">
              {isAdmin
                ? "Pessoas da comunidade"
                : `Integrantes ${preposition} ${possessive} ${groupWord}`}
            </CardTitle>
            {!isAdmin ? (
              <Badge variant="secondary" className="text-xs font-normal">
                {scopeBadgeLabel}
              </Badge>
            ) : null}
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
              {filteredPeople.length} {filteredPeople.length === 1 ? "pessoa" : "pessoas"}
            </Badge>
          </div>
        </div>

        {/* Barra de Pesquisa e Filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar por nome, email ou ministério..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 pr-8 text-sm"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          {departments.length > 0 && (
            <div className="w-full sm:w-56 shrink-0">
              <NativeSelect
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="h-9 text-xs"
                aria-label="Filtrar por departamento"
              >
                <NativeSelectOption value="all">
                  Todos os {groupWord}
                </NativeSelectOption>
                {departments.map((dept) => (
                  <NativeSelectOption key={dept.id} value={dept.id}>
                    {dept.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}
        </div>

        {/* Chips de Filtro Rápido */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Todos ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("account")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === "account"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Com conta ({counts.account})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("no-account")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === "no-account"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Sem conta ({counts.noAccount})
          </button>

          {counts.pending > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === "pending"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
              }`}
            >
              <ClockIcon className="size-3" />
              Convites pendentes ({counts.pending})
            </button>
          )}

          {counts.care > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter("care")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === "care"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30"
              }`}
            >
              <HeartHandshakeIcon className="size-3 text-amber-600 dark:text-amber-400" />
              Pedidos de oração / conversa ({counts.care})
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {people.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserPlusIcon className="size-6" />
            </span>
            <div className="max-w-md space-y-1">
              <p className="text-base font-semibold text-foreground">
                Nenhuma pessoa cadastrada ainda
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Comece cadastrando os voluntários e líderes da igreja para organizar
                as escalas e departamentos.
              </p>
            </div>
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              Nenhuma pessoa encontrada com os filtros selecionados.
            </p>
            <p className="text-xs text-muted-foreground">
              Tente alterar os termos de busca ou limpar os filtros aplicados.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="mt-2 text-xs"
            >
              Limpar filtros
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pessoa</TableHead>
                      <TableHead>Status / Papel</TableHead>
                      <TableHead>
                        {terminology?.plural ?? "Departamentos"}
                      </TableHead>
                      {isAdmin ? (
                        <TableHead className="text-right">Ações</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPeople.map((person) => {
                      const role = person.userId
                        ? roleByUserId[person.userId]
                        : undefined;
                      const email = personDisplayEmail(person)?.toLowerCase();
                      const isPendingInvite = Boolean(
                        !role && email && pendingInvitationEmails?.has(email),
                      );
                      const birthdayLabel = formatOwnBirthday(
                        personDisplayBirthday(person),
                        isAdmin,
                      );
                      const care = careByPersonId?.[person.id];

                      return (
                        <TableRow key={person.id} className="group hover:bg-muted/30">
                          <TableCell>
                            <Link
                              href={`/dashboard/members/${person.id}`}
                              prefetch={true}
                              className="flex min-w-56 items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
                            >
                              <Avatar className="size-9 ring-1 ring-border group-hover:ring-primary transition-all shrink-0">
                                <AvatarImage
                                  src={
                                    personDisplayImage(person) ?? undefined
                                  }
                                  alt={personDisplayName(person)}
                                />
                                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                                  {getInitials(personDisplayName(person))}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                                    {personDisplayName(person)}
                                  </p>
                                  <ChevronRightIcon className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </div>
                                <p className="truncate text-xs text-muted-foreground">
                                  {personDisplayEmail(person) ??
                                    "Sem email cadastrado"}
                                </p>
                                {birthdayLabel ? (
                                  <p className="text-[11px] text-muted-foreground">
                                    Aniversário: {birthdayLabel}
                                  </p>
                                ) : null}

                                {/* Alertas de Cuidado Pastoral */}
                                {care && (
                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    {care.needsPrayer && (
                                      <span
                                        title={`Pediu oração em ${care.date}`}
                                        className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                      >
                                        <HeartHandshakeIcon className="size-3 shrink-0" />
                                        Pediu oração
                                      </span>
                                    )}
                                    {care.needsTalk && (
                                      <span
                                        title={`Pediu conversa em ${care.date}`}
                                        className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400 border border-blue-500/20"
                                      >
                                        <MessageSquareHeartIcon className="size-3 shrink-0" />
                                        Pediu conversa
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Link>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              {role ? (
                                <RoleBadge role={role} />
                              ) : (
                                <>
                                  <Badge
                                    variant="outline"
                                    className="font-normal text-xs"
                                  >
                                    Sem conta
                                  </Badge>
                                  {isPendingInvite ? (
                                    <span
                                      title="Convite enviado e aguardando resposta"
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400"
                                    >
                                      <ClockIcon className="size-3 shrink-0" />
                                      Convite pendente
                                    </span>
                                  ) : null}
                                </>
                              )}
                              {person.user?.pwaInstalled ? (
                                <span
                                  title={`Aplicativo PWA instalado${person.user.pwaPlatform ? ` (${person.user.pwaPlatform.toUpperCase()})` : ""}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
                                >
                                  <SmartphoneIcon className="size-3 shrink-0" />
                                  App PWA
                                </span>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="max-w-72">
                              <MembershipChips
                                memberships={person.memberships}
                                singularGroup={terminology?.singular.toLowerCase()}
                              />
                            </div>
                          </TableCell>

                          {isAdmin ? (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end">
                                <PersonActionsDropdown
                                  person={person}
                                  linkableMembers={linkableMembers}
                                  currentUserId={currentUserId}
                                />
                              </div>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile View: Cards */}
            <ul className="space-y-3 p-3 md:hidden">
              {filteredPeople.map((person) => {
                const role = person.userId
                  ? roleByUserId[person.userId]
                  : undefined;
                const email = personDisplayEmail(person)?.toLowerCase();
                const isPendingInvite = Boolean(
                  !role && email && pendingInvitationEmails?.has(email),
                );
                const birthdayLabel = formatOwnBirthday(
                  personDisplayBirthday(person),
                  isAdmin,
                );
                const care = careByPersonId?.[person.id];

                return (
                  <li
                    key={person.id}
                    className="overflow-hidden rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/dashboard/members/${person.id}`}
                        prefetch={true}
                        className="group flex items-start gap-3 flex-1 min-w-0"
                      >
                        <Avatar className="size-11 shrink-0 ring-1 ring-border group-hover:ring-primary transition-all">
                          <AvatarImage
                            src={personDisplayImage(person) ?? undefined}
                            alt={personDisplayName(person)}
                          />
                          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                            {getInitials(personDisplayName(person))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              {personDisplayName(person)}
                            </p>
                            {role ? (
                              <RoleBadge role={role} />
                            ) : (
                              <Badge
                                variant="outline"
                                className="font-normal text-[11px]"
                              >
                                Sem conta
                              </Badge>
                            )}
                            {isPendingInvite ? (
                              <span
                                title="Convite enviado e aguardando resposta"
                                className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              >
                                <ClockIcon className="size-2.5 shrink-0" />
                                Convite pendente
                              </span>
                            ) : null}
                            {person.user?.pwaInstalled ? (
                              <span
                                title="App PWA Instalado"
                                className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              >
                                <SmartphoneIcon className="size-2.5 shrink-0" />
                                PWA
                              </span>
                            ) : null}
                          </div>

                          <p className="truncate text-xs text-muted-foreground">
                            {personDisplayEmail(person) ??
                              "Sem email cadastrado"}
                          </p>

                          {birthdayLabel ? (
                            <p className="text-[11px] text-muted-foreground">
                              Aniversário: {birthdayLabel}
                            </p>
                          ) : null}

                          {/* Alertas Pastorais no Mobile */}
                          {care && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {care.needsPrayer && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  <HeartHandshakeIcon className="size-3 shrink-0" />
                                  Pediu oração
                                </span>
                              )}
                              {care.needsTalk && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400 border border-blue-500/20">
                                  <MessageSquareHeartIcon className="size-3 shrink-0" />
                                  Pediu conversa
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>

                      {isAdmin ? (
                        <div className="shrink-0">
                          <PersonActionsDropdown
                            person={person}
                            linkableMembers={linkableMembers}
                            currentUserId={currentUserId}
                          />
                        </div>
                      ) : null}
                    </div>

                    {/* Departamentos */}
                    <div className="border-t border-border/40 pt-2">
                      <MembershipChips
                        memberships={person.memberships}
                        limit={4}
                        singularGroup={terminology?.singular.toLowerCase()}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MembershipChips({
  memberships,
  limit = 2,
  singularGroup = "departamento",
}: {
  memberships: PersonRecord["memberships"];
  limit?: number;
  singularGroup?: string;
}) {
  if (memberships.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        Sem {singularGroup}
      </span>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full flex-wrap gap-1.5">
      {memberships.slice(0, limit).map((membership) => {
        const functions = membership.assignments
          .map((assignment) => assignment.function.name)
          .join(", ");
        const label = `${membership.department.name}${
          functions ? ` · ${functions}` : ""
        }`;

        return (
          <span
            key={membership.id}
            title={label}
            className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground border border-border/40"
          >
            {membership.isLeader ? (
              <CrownIcon className="size-3 shrink-0 text-amber-500" />
            ) : null}
            <span className="min-w-0 truncate">{label}</span>
          </span>
        );
      })}
      {memberships.length > limit ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground border border-border/40">
          +{memberships.length - limit}
        </span>
      ) : null}
    </div>
  );
}
