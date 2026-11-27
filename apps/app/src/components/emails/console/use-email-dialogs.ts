"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  getTemplatePreviewAction,
  sendTestEmailAction,
  type EmailLogItem,
} from "@/app/actions/emails";
import type { EmailTemplateKey } from "@/lib/email/templates";

import { formatTypeName } from "./email-format";
import type {
  TemplatePreviewState,
  TestEmailDialogState,
} from "./types";

type StartTransition = (callback: () => void | Promise<void>) => void;

type UseEmailDialogsArgs = {
  userEmail: string;
  churchName: string;
  startTransition: StartTransition;
  onLogsRefreshed: () => void;
};

export function useEmailDialogs({
  userEmail,
  churchName,
  startTransition,
  onLogsRefreshed,
}: UseEmailDialogsArgs) {
  // Preview Dialog State
  const [selectedLog, setSelectedLog] = useState<EmailLogItem | null>(null);

  // Template Preview Dialog State
  const [templatePreview, setTemplatePreview] = useState<TemplatePreviewState>({
    open: false,
    templateKey: null,
    html: "",
    subject: "",
    previewMode: "desktop",
    loading: false,
  });

  // Test Email Dialog State
  const [testEmailDialog, setTestEmailDialog] =
    useState<TestEmailDialogState>({
      open: false,
      templateKey: null,
      templateName: "",
      targetEmail: userEmail,
      loading: false,
    });

  function handleSelectLog(log: EmailLogItem) {
    setSelectedLog(log);
  }

  function handleCloseLogPreview() {
    setSelectedLog(null);
  }

  function handleTemplatePreviewOpenChange(open: boolean) {
    setTemplatePreview((prev) => ({ ...prev, open }));
  }

  function handleTemplatePreviewModeChange(mode: "desktop" | "mobile") {
    setTemplatePreview((prev) => ({ ...prev, previewMode: mode }));
  }

  function handleOpenTemplatePreview(key: EmailTemplateKey) {
    setTemplatePreview({
      open: true,
      templateKey: key,
      html: "",
      subject: "",
      previewMode: "desktop",
      loading: true,
    });

    startTransition(async () => {
      const res = await getTemplatePreviewAction(key, { churchName });
      if (res.ok) {
        setTemplatePreview((prev) => ({
          ...prev,
          html: res.html,
          subject: res.subject,
          loading: false,
        }));
      } else {
        toast.error(res.error || "Erro ao gerar prévia do modelo.");
        setTemplatePreview((prev) => ({ ...prev, loading: false }));
      }
    });
  }

  function openTestEmailDialog(
    templateKey: EmailTemplateKey,
    templateName: string,
  ) {
    setTestEmailDialog({
      open: true,
      templateKey,
      templateName,
      targetEmail: userEmail,
      loading: false,
    });
  }

  function handleTestEmailDialogOpenChange(open: boolean) {
    setTestEmailDialog((prev) => ({ ...prev, open }));
  }

  function handleTestEmailTargetChange(targetEmail: string) {
    setTestEmailDialog((prev) => ({ ...prev, targetEmail }));
  }

  function handleTemplatePreviewSendTest() {
    const key = templatePreview.templateKey;
    if (!key) return;
    setTemplatePreview((prev) => ({ ...prev, open: false }));
    openTestEmailDialog(key, formatTypeName(key));
  }

  // Send Test Email via Brevo
  async function handleSendTestEmail() {
    if (!testEmailDialog.templateKey || !testEmailDialog.targetEmail) {
      toast.error("Informe um email destinatário.");
      return;
    }

    setTestEmailDialog((prev) => ({ ...prev, loading: true }));
    try {
      const res = await sendTestEmailAction(
        testEmailDialog.templateKey,
        testEmailDialog.targetEmail,
      );

      if (res.ok) {
        toast.success(
          `Email de teste enviado com sucesso para ${testEmailDialog.targetEmail}!`,
        );
        setTestEmailDialog((prev) => ({ ...prev, open: false, loading: false }));
        onLogsRefreshed();
      } else {
        toast.error(res.error || "Falha ao enviar email de teste.");
        setTestEmailDialog((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      toast.error("Erro inesperado ao enviar teste.");
      setTestEmailDialog((prev) => ({ ...prev, loading: false }));
    }
  }

  return {
    selectedLog,
    handleSelectLog,
    handleCloseLogPreview,
    templatePreview,
    handleTemplatePreviewOpenChange,
    handleTemplatePreviewModeChange,
    handleOpenTemplatePreview,
    handleTemplatePreviewSendTest,
    testEmailDialog,
    openTestEmailDialog,
    handleTestEmailDialogOpenChange,
    handleTestEmailTargetChange,
    handleSendTestEmail,
  } as const;
}

export type EmailDialogsState = ReturnType<typeof useEmailDialogs>;
