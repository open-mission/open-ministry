"use client";

import { useState } from "react";
import { BellRingIcon, CalendarClockIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RehearsalAlertsDialog } from "@/features/rehearsals/components/rehearsal-alerts-dialog";
import type { RehearsalAlertRuleRow } from "@/features/rehearsals/components/rehearsal-alerts-dialog";
import {
  RehearsalFormDialog,
} from "@/features/rehearsals/components/rehearsal-form-dialog";
import {
  RehearsalList,
  type RehearsalListItem,
} from "@/features/rehearsals/components/rehearsal-list";
import type { RehearsalSongOption } from "@/features/rehearsals/lib/rehearsal-ui";

type RehearsalsTabProps = {
  departmentId: string;
  departmentName: string;
  rehearsals: RehearsalListItem[];
  songs: RehearsalSongOption[];
  alertRules: RehearsalAlertRuleRow[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageAlerts: boolean;
};

export function RehearsalsTab({
  departmentId,
  departmentName,
  rehearsals,
  songs,
  alertRules,
  canCreate,
  canUpdate,
  canDelete,
  canManageAlerts,
}: RehearsalsTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RehearsalListItem | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (rehearsal: RehearsalListItem) => {
    setEditing(rehearsal);
    setFormOpen(true);
  };

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditing(null);
  };

  return (
    <Card className="min-w-0 overflow-hidden border-border/80 shadow-xs">
      <CardHeader className="gap-3 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <CalendarClockIcon className="size-4" />
            </span>
            <div className="space-y-1">
              <CardTitle className="font-heading text-xl tracking-tight">
                Ensaios
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Agende os ensaios do departamento, monte o repertório e configure
                os lembretes automáticos da equipe.
              </CardDescription>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAlertsOpen(true)}
              className="min-h-11 sm:min-h-9"
            >
              <BellRingIcon data-icon="inline-start" />
              Lembretes
            </Button>
            {canCreate ? (
              <Button
                type="button"
                onClick={openCreate}
                className="min-h-11 sm:min-h-9"
              >
                <PlusIcon data-icon="inline-start" />
                Novo ensaio
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <RehearsalList
          departmentId={departmentId}
          rehearsals={rehearsals}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onEdit={openEdit}
          onNew={canCreate ? openCreate : undefined}
        />
      </CardContent>

      <RehearsalFormDialog
        departmentId={departmentId}
        songs={songs}
        rehearsal={editing}
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        canEditSongs={canCreate || canUpdate}
      />

      <RehearsalAlertsDialog
        departmentId={departmentId}
        departmentName={departmentName}
        rules={alertRules}
        open={alertsOpen}
        onOpenChange={setAlertsOpen}
        canManage={canManageAlerts}
      />
    </Card>
  );
}
