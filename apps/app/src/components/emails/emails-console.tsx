"use client";

import { FileTextIcon, SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { EmailLogPreviewDialog } from "./console/email-log-preview-dialog";
import { EmailTemplatePreviewDialog } from "./console/email-template-preview-dialog";
import { EmailTestDialog } from "./console/email-test-dialog";
import { EmailsHistoryTab } from "./console/emails-history-tab";
import { EmailsKpiCards } from "./console/emails-kpi-cards";
import { EmailsTemplatesTab } from "./console/emails-templates-tab";
import type { EmailsConsoleProps } from "./console/types";
import { useEmailDialogs } from "./console/use-email-dialogs";
import { useEmailsConsole } from "./console/use-emails-console";

export type { EmailsConsoleProps } from "./console/types";

export function EmailsConsole({
  initialLogs,
  initialStats,
  churchName,
  userEmail,
}: EmailsConsoleProps) {
  const mail = useEmailsConsole({ initialLogs, initialStats });
  const dialogs = useEmailDialogs({
    userEmail,
    churchName,
    startTransition: mail.startTransition,
    onLogsRefreshed: mail.handleRefreshLogs,
  });

  return (
    <div className="space-y-6">
      <EmailsKpiCards stats={mail.stats} deliveryRate={mail.deliveryRate} />

      {/* Main Tabs */}
      <Tabs defaultValue="history" className="w-full space-y-5">
        <TabsList className="grid w-full grid-cols-2 sm:w-95">
          <TabsTrigger value="history" className="gap-2">
            <FileTextIcon className="size-4" />
            <span>Emails Enviados</span>
            {mail.logs.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 text-[10px] px-1.5 py-0"
              >
                {mail.logs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <SparklesIcon className="size-4" />
            <span>Modelos (Templates)</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Histórico */}
        <TabsContent value="history" className="space-y-4">
          <EmailsHistoryTab
            filteredLogs={mail.filteredLogs}
            search={mail.search}
            onSearchChange={mail.setSearch}
            statusFilter={mail.statusFilter}
            onStatusFilterChange={mail.setStatusFilter}
            typeFilter={mail.typeFilter}
            onTypeFilterChange={mail.setTypeFilter}
            isPending={mail.isPending}
            onRefresh={mail.handleRefreshLogs}
            onOpenLog={dialogs.handleSelectLog}
            onResend={mail.handleResend}
          />
        </TabsContent>

        {/* Tab 2: Modelos (Templates) */}
        <TabsContent value="templates" className="space-y-4">
          <EmailsTemplatesTab
            onPreviewTemplate={dialogs.handleOpenTemplatePreview}
            onTestTemplate={dialogs.openTestEmailDialog}
          />
        </TabsContent>
      </Tabs>

      {/* Modal: Visualizar Log de Email Enviado */}
      <EmailLogPreviewDialog
        log={dialogs.selectedLog}
        isPending={mail.isPending}
        onClose={dialogs.handleCloseLogPreview}
        onResend={mail.handleResend}
      />

      {/* Modal: Prévia ao vivo do Modelo React Email */}
      <EmailTemplatePreviewDialog
        preview={dialogs.templatePreview}
        onOpenChange={dialogs.handleTemplatePreviewOpenChange}
        onPreviewModeChange={dialogs.handleTemplatePreviewModeChange}
        onClose={() => dialogs.handleTemplatePreviewOpenChange(false)}
        onSendTest={dialogs.handleTemplatePreviewSendTest}
      />

      {/* Modal: Enviar Email de Teste */}
      <EmailTestDialog
        state={dialogs.testEmailDialog}
        onOpenChange={dialogs.handleTestEmailDialogOpenChange}
        onTargetEmailChange={dialogs.handleTestEmailTargetChange}
        onSubmit={dialogs.handleSendTestEmail}
      />
    </div>
  );
}
