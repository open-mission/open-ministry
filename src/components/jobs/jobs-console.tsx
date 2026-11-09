"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  LayersIcon,
  Loader2Icon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";

import {
  deleteBackgroundJobAction,
  getBackgroundJobsAction,
  retryBackgroundJobAction,
} from "@/app/actions/jobs";
import type { BackgroundJobRecord } from "@/lib/jobs/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type JobsConsoleProps = {
  initialJobs: BackgroundJobRecord[];
};

export function JobsConsole({ initialJobs }: JobsConsoleProps) {
  const [jobs, setJobs] = useState<BackgroundJobRecord[]>(initialJobs);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "failed">("all");
  const [isPending, startTransition] = useTransition();

  const hasActiveJobs = jobs.some(
    (j) => j.status === "pending" || j.status === "processing",
  );

  // Polling reativo enquanto houver tarefas em execução
  useEffect(() => {
    if (!hasActiveJobs) return;

    const interval = setInterval(async () => {
      try {
        const res = await getBackgroundJobsAction();
        if (res.ok && res.jobs) {
          setJobs(res.jobs);
        }
      } catch (err) {
        console.error("Erro ao atualizar tarefas em background:", err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [hasActiveJobs]);

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getBackgroundJobsAction();
      if (res.ok && res.jobs) {
        setJobs(res.jobs);
        toast.success("Lista de tarefas atualizada.");
      }
    });
  };

  const handleRetry = (jobId: string) => {
    startTransition(async () => {
      const res = await retryBackgroundJobAction(jobId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Tarefa reiniciada na fila!");
      const refresh = await getBackgroundJobsAction();
      if (refresh.ok && refresh.jobs) setJobs(refresh.jobs);
    });
  };

  const handleDelete = (jobId: string) => {
    startTransition(async () => {
      const res = await deleteBackgroundJobAction(jobId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Tarefa removida.");
    });
  };

  const filteredJobs = jobs.filter((job) => {
    if (filter === "active")
      return job.status === "pending" || job.status === "processing";
    if (filter === "completed") return job.status === "completed";
    if (filter === "failed") return job.status === "failed";
    return true;
  });

  const activeCount = jobs.filter(
    (j) => j.status === "pending" || j.status === "processing",
  ).length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Controls & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          value={filter}
          onValueChange={(val) =>
            setFilter(val as "all" | "active" | "completed" | "failed")
          }
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-4 w-full sm:w-auto h-9">
            <TabsTrigger value="all" className="text-xs">
              Todas ({jobs.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs gap-1">
              Ativas
              {activeCount > 0 ? (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  {activeCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">
              Concluídas ({completedCount})
            </TabsTrigger>
            <TabsTrigger value="failed" className="text-xs">
              Falhas ({failedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending}
          className="gap-1.5 h-9 shrink-0 self-end sm:self-auto"
        >
          <RefreshCwIcon
            className={`size-3.5 ${isPending ? "animate-spin" : ""}`}
          />
          <span>Atualizar</span>
        </Button>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <LayersIcon className="size-6" />
            </div>
            <p className="font-heading text-lg font-medium">
              Nenhuma tarefa nesta visualização
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Quando você solicitar a exportação de cronogramas em segundo plano
              ou outras rotinas assíncronas, o progresso aparecerá aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const isProcessing = job.status === "processing";
            const isPendingStatus = job.status === "pending";
            const isCompleted = job.status === "completed";
            const isFailed = job.status === "failed";

            return (
              <Card
                key={job.id}
                className={`overflow-hidden transition-all ${
                  isProcessing
                    ? "border-primary/50 shadow-xs"
                    : isFailed
                      ? "border-destructive/30"
                      : ""
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Job Details */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground mt-0.5">
                        <FileTextIcon className="size-5 text-primary" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground truncate">
                            {job.title}
                          </h4>

                          {/* Status Badge */}
                          {isPendingStatus ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 text-[11px]"
                            >
                              <ClockIcon className="size-3" />
                              Pendente
                            </Badge>
                          ) : null}

                          {isProcessing ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300 text-[11px]"
                            >
                              <Loader2Icon className="size-3 animate-spin" />
                              Processando ({job.progress}%)
                            </Badge>
                          ) : null}

                          {isCompleted ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px]"
                            >
                              <CheckCircle2Icon className="size-3" />
                              Concluído
                            </Badge>
                          ) : null}

                          {isFailed ? (
                            <Badge
                              variant="destructive"
                              className="gap-1 text-[11px]"
                            >
                              <AlertCircleIcon className="size-3" />
                              Falhou
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Criada em{" "}
                          {new Date(job.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>

                        {/* Error message if failed */}
                        {isFailed && job.error ? (
                          <p className="text-xs font-medium text-destructive mt-1 bg-destructive/10 p-2 rounded-md">
                            {job.error}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isCompleted && job.result?.downloadUrl ? (
                        <Button
                          asChild
                          size="sm"
                          variant="default"
                          className="gap-1.5 h-8 text-xs font-medium"
                        >
                          <a href={job.result.downloadUrl} download>
                            <DownloadIcon className="size-3.5" />
                            <span>Baixar arquivo</span>
                          </a>
                        </Button>
                      ) : null}

                      {isFailed ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(job.id)}
                          disabled={isPending}
                          className="gap-1.5 h-8 text-xs"
                        >
                          <RefreshCwIcon className="size-3.5" />
                          <span>Tentar novamente</span>
                        </Button>
                      ) : null}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(job.id)}
                        disabled={isPending || isProcessing}
                        className="size-8 p-0 text-muted-foreground hover:text-destructive"
                        title="Remover tarefa"
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {isProcessing || isPendingStatus ? (
                    <div className="mt-3">
                      <Progress value={job.progress} className="h-1.5" />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
