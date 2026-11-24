"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  HistoryIcon,
  Loader2Icon,
  LockIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from "lucide-react";

import {
  listPlatformAuditLogAction,
  listPlatformOperatorsAction,
  promotePlatformOperatorAction,
  revokePlatformOperatorAction,
  type PlatformAuditEntry,
  type PlatformOperatorView,
} from "@/app/actions/platform";
import { PlatformConfirmDialog } from "@/components/platform/platform-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate, formatDateTime } from "@/lib/format";

type PlatformOperatorsViewProps = {
  initialOperators: PlatformOperatorView[];
  initialAuditEntries: PlatformAuditEntry[];
  initialAuditTotal: number;
  currentOperatorEmail: string | null;
};

export function PlatformOperatorsView({
  initialOperators,
  initialAuditEntries,
  initialAuditTotal,
  currentOperatorEmail,
}: PlatformOperatorsViewProps) {
  const [operators, setOperators] = useState(initialOperators);
  const [auditEntries, setAuditEntries] = useState(initialAuditEntries);
  const [auditTotal, setAuditTotal] = useState(initialAuditTotal);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<PlatformOperatorView | null>(
    null,
  );

  const [isPromoting, startPromoting] = useTransition();
  const [isRevoking, startRevoking] = useTransition();
  const [isSearchingAudit, startSearchingAudit] = useTransition();

  async function reloadAll(search = auditSearch) {
    const [nextOps, nextAudit] = await Promise.all([
      listPlatformOperatorsAction(),
      listPlatformAuditLogAction({ search: search.trim() || undefined, limit: 50 }),
    ]);
    setOperators(nextOps);
    setAuditEntries(nextAudit.entries);
    setAuditTotal(nextAudit.total);
  }

  function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    const email = promoteEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Informe o e-mail de uma conta cadastrada.");
      return;
    }

    startPromoting(async () => {
      const res = await promotePlatformOperatorAction(email);
      if (!res.ok) {
        toast.error(res.error || "Não foi possível promover este usuário.");
        return;
      }
      setPromoteEmail("");
      await reloadAll();
      toast.success(`${email} promovido a Super Admin!`);
    });
  }

  function handleConfirmRevoke() {
    if (!revokeTarget) return;
    startRevoking(async () => {
      const res = await revokePlatformOperatorAction(revokeTarget.id);
      if (!res.ok) {
        toast.error(res.error || "Não foi possível revogar o operador.");
        return;
      }
      setRevokeTarget(null);
      await reloadAll();
      toast.success("Acesso de Super Admin revogado.");
    });
  }

  function handleSearchAudit(e: React.FormEvent) {
    e.preventDefault();
    startSearchingAudit(async () => {
      try {
        const res = await listPlatformAuditLogAction({
          search: auditSearch.trim() || undefined,
          limit: 50,
        });
        setAuditEntries(res.entries);
        setAuditTotal(res.total);
      } catch {
        toast.error("Erro ao consultar log de auditoria.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Operadores & Auditoria
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie quem possui acesso de Super Admin à plataforma e acompanhe o
          histórico auditável das operações globais.
        </p>
      </header>

      {/* Operators Card */}
      <Card>
        <CardHeader className="space-y-2 border-b border-border/60 pb-5">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-primary" />
            <CardTitle className="font-heading text-xl tracking-tight">
              Operadores da Plataforma ({operators.length})
            </CardTitle>
          </div>
          <CardDescription>
            Operadores listados no bootstrap (.env) e o último Super Admin ativo
            têm proteção contra remoção acidental.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          <form
            onSubmit={handlePromote}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <Input
              type="email"
              aria-label="E-mail do usuário para promover"
              placeholder="E-mail de usuário já cadastrado (ex.: ops@openministry.app)"
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
              className="min-h-11 sm:min-h-9 sm:max-w-md"
            />
            <Button
              type="submit"
              disabled={isPromoting || !promoteEmail.trim()}
              className="min-h-11 gap-2 sm:min-h-9"
            >
              {isPromoting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <UserPlusIcon className="size-4" />
              )}
              Promover a Super Admin
            </Button>
          </form>

          <div className="divide-y divide-border/60 rounded-xl border border-border/70">
            {operators.map((op) => {
              const isSelf =
                Boolean(currentOperatorEmail) &&
                op.email.toLowerCase() === currentOperatorEmail?.toLowerCase();
              const isLastOperator = operators.length <= 1;
              const lockReason = op.isBootstrap
                ? "Protegido pelo bootstrap (.env)"
                : isLastOperator
                  ? "Último operador ativo"
                  : null;

              return (
                <div
                  key={op.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{op.name}</p>
                      {op.isBootstrap ? (
                        <Badge
                          variant="secondary"
                          className="gap-1 text-[11px] font-medium"
                        >
                          <LockIcon className="size-3" />
                          Bootstrap (.env)
                        </Badge>
                      ) : null}
                      {isSelf ? (
                        <Badge variant="outline" className="text-[11px]">
                          Você
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {op.email} · Desde {formatDate(op.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {lockReason ? (
                      <span className="text-xs text-muted-foreground">
                        {lockReason}
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={Boolean(lockReason)}
                      onClick={() => setRevokeTarget(op)}
                      className="min-h-11 gap-1.5 text-destructive hover:text-destructive sm:min-h-8"
                    >
                      <ShieldAlertIcon className="size-3.5" />
                      Revogar acesso
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Card */}
      <Card>
        <CardHeader className="space-y-3 border-b border-border/60 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <HistoryIcon className="size-5 text-primary" />
                <CardTitle className="font-heading text-xl tracking-tight">
                  Auditoria da Plataforma ({auditTotal})
                </CardTitle>
              </div>
              <CardDescription>
                Eventos críticos envolvendo planos, organizações, instâncias e
                operadores.
              </CardDescription>
            </div>

            <form
              onSubmit={handleSearchAudit}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1 sm:w-64">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Filtrar ação ou operador..."
                  aria-label="Filtrar log de auditoria"
                  className="min-h-11 pl-9 text-xs sm:min-h-9"
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                disabled={isSearchingAudit}
                className="min-h-11 sm:min-h-9"
              >
                {isSearchingAudit ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  "Filtrar"
                )}
              </Button>
            </form>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {auditEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum registro de auditoria encontrado para este filtro.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {auditEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-1.5 py-3.5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px] font-normal"
                      >
                        {entry.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {entry.actorEmail || "sistema"}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{entry.summary}</p>
                    {entry.targetId ? (
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {entry.targetType}: {entry.targetId}
                      </p>
                    ) : null}
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PlatformConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title="Revogar acesso de Super Admin?"
        description={
          revokeTarget ? (
            <>
              <strong>{revokeTarget.name}</strong> ({revokeTarget.email}) perderá
              imediatamente o acesso ao painel da plataforma.
            </>
          ) : null
        }
        confirmLabel="Revogar operador"
        pending={isRevoking}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  );
}
