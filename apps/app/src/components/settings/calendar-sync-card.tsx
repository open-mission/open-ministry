"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  ExternalLinkIcon,
  Link2Icon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { CopyTextButton } from "@/components/members/copy-text-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  createCalendarFeedAction,
  listCalendarFeedsAction,
  revokeCalendarFeedAction,
  rotateCalendarFeedAction,
  updateCalendarFeedAction,
  type CalendarFeedLink,
} from "@/features/calendar/actions/feed.actions";
import type { CalendarFeedView } from "@/lib/calendar-feed-data";

type ToggleKey =
  | "includeServices"
  | "includeRehearsals"
  | "includeDepartmentEvents"
  | "includeAssignments";

type ToggleSettings = Record<ToggleKey, boolean>;

const DEFAULT_SETTINGS: ToggleSettings = {
  includeServices: true,
  includeRehearsals: true,
  includeDepartmentEvents: true,
  includeAssignments: true,
};

function formatDate(value: string | null): string {
  if (!value) return "ainda não usado";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CalendarSyncCard({ feeds }: { feeds: CalendarFeedView[] }) {
  const [currentFeeds, setCurrentFeeds] = useState(feeds);
  const [label, setLabel] = useState("");
  const [settings, setSettings] = useState<ToggleSettings>(DEFAULT_SETTINGS);
  const [newLink, setNewLink] = useState<CalendarFeedLink | null>(null);
  const [isPending, startTransition] = useTransition();

  function refreshFeeds() {
    startTransition(async () => {
      const result = await listCalendarFeedsAction();
      if (result.ok) setCurrentFeeds(result.feeds.map((feed) => ({
        id: feed.id,
        label: feed.label,
        includeServices: feed.includeServices,
        includeRehearsals: feed.includeRehearsals,
        includeDepartmentEvents: feed.includeDepartmentEvents,
        includeAssignments: feed.includeAssignments,
        lastUsedAt: feed.lastUsedAt ? feed.lastUsedAt.toISOString() : null,
        createdAt: feed.createdAt.toISOString(),
      })));
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createCalendarFeedAction({ label, ...settings });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNewLink(result.feed);
      setLabel("");
      toast.success("Link criado! Copie e guarde agora — ele não aparecerá de novo.");
      refreshFeeds();
    });
  }

  function handleRotate(feed: CalendarFeedView) {
    startTransition(async () => {
      const result = await rotateCalendarFeedAction(feed.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNewLink(result.feed);
      toast.success("Novo link gerado. O anterior parou de funcionar.");
      refreshFeeds();
    });
  }

  function handleRevoke(feed: CalendarFeedView) {
    startTransition(async () => {
      const result = await revokeCalendarFeedAction(feed.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (newLink?.id === feed.id) setNewLink(null);
      toast.success("Link revogado.");
      refreshFeeds();
    });
  }

  function handleToggle(feed: CalendarFeedView, key: ToggleKey, value: boolean) {
    const next = { ...feed, [key]: value };
    startTransition(async () => {
      const result = await updateCalendarFeedAction(feed.id, {
        includeServices: next.includeServices,
        includeRehearsals: next.includeRehearsals,
        includeDepartmentEvents: next.includeDepartmentEvents,
        includeAssignments: next.includeAssignments,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCurrentFeeds((previous) => previous.map((item) => item.id === feed.id ? next : item));
      toast.success("Preferências do link atualizadas.");
    });
  }

  const googleUrl = newLink
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(newLink.url)}`
    : null;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDaysIcon className="size-5" />
          </div>
          <div>
            <CardTitle className="font-heading text-xl tracking-tight">
              Sincronizar com meu calendário
            </CardTitle>
            <CardDescription>
             Inscreva sua agenda no Apple Calendar, Google Calendar ou Outlook.
              Quando o evento mudar no app, o calendário atualiza na próxima
              consulta dele.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              O link é como uma senha: quem o tiver vê sua agenda. Ele aparece
              apenas agora — depois não dá para consultá-lo novamente. Se
              vazar, gere um novo link. A atualização depende do app de
              calendário (Apple cerca de 1h; Google de 8 a 24h).
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feed-label">Nome do link (opcional)</Label>
            <Input
              id="feed-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              maxLength={80}
              placeholder="Ex.: iPhone, Outlook do trabalho"
              disabled={isPending}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">O que incluir</p>
            <ToggleRow
              id="create-services"
              label="Cultos"
              checked={settings.includeServices}
              onCheckedChange={(value) => setSettings((s) => ({ ...s, includeServices: value }))}
              disabled={isPending}
            />
            <ToggleRow
              id="create-rehearsals"
              label="Ensaios do meu departamento"
              checked={settings.includeRehearsals}
              onCheckedChange={(value) => setSettings((s) => ({ ...s, includeRehearsals: value }))}
              disabled={isPending}
            />
            <ToggleRow
              id="create-department-events"
              label="Eventos do meu departamento"
              checked={settings.includeDepartmentEvents}
              onCheckedChange={(value) => setSettings((s) => ({ ...s, includeDepartmentEvents: value }))}
              disabled={isPending}
            />
            <ToggleRow
              id="create-assignments"
              label="Cultos em que estou escalado"
              checked={settings.includeAssignments}
              onCheckedChange={(value) => setSettings((s) => ({ ...s, includeAssignments: value }))}
              disabled={isPending}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              Gerar link
            </Button>
          </div>
        </div>

        {newLink ? (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Link2Icon className="size-4 text-primary" aria-hidden />
              <p className="text-sm font-semibold">Seu link está pronto</p>
              <Badge variant="outline" className="ml-auto text-[10px]">
               mostrado uma vez
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="feed-webcal">Apple Calendar (webcal)</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="feed-webcal"
                  readOnly
                  value={newLink.webcalUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <div className="flex shrink-0 gap-2">
                  <CopyTextButton value={newLink.webcalUrl} label="Copiar" />
                  <Button asChild size="sm" variant="outline">
                    <a href={newLink.webcalUrl}>
                      Abrir <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="feed-url">Google Calendar / Outlook (URL)</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="feed-url"
                  readOnly
                  value={newLink.url}
                  onFocus={(event) => event.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <div className="flex shrink-0 gap-2">
                  <CopyTextButton value={newLink.url} label="Copiar" />
                  {googleUrl ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                        Google <ExternalLinkIcon className="size-3.5" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                No Google ou Outlook, use “Adicionar por URL” e cole o link acima.
              </p>
            </div>
          </div>
        ) : null}

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Meus links</p>
              <p className="text-xs text-muted-foreground">
                {currentFeeds.length === 0
                  ? "Você ainda não tem nenhum link ativo."
                  : `${currentFeeds.length} link(s) ativo(s).`}
              </p>
            </div>
          </div>

          {currentFeeds.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Gere um link acima para começar a sincronizar.
            </p>
          ) : (
            <ul className="space-y-3">
              {currentFeeds.map((feed) => (
                <li key={feed.id} className="space-y-3 rounded-xl border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {feed.label || "Minha agenda"}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">
                          Ativo
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Criado em {formatDate(feed.createdAt)} · último acesso{" "}
                        {formatDate(feed.lastUsedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2" disabled={isPending}>
                            <RefreshCwIcon className="size-3.5" />
                            Novo link
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Gerar um novo link?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O link atual para de funcionar imediatamente. Você
                              precisará inscrever o novo link no seu calendário.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRotate(feed)}>
                              Gerar novo
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-2 text-destructive" disabled={isPending}>
                            <Trash2Icon className="size-3.5" />
                            Revogar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revogar este link?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A assinatura para de receber atualizações. Esta
                              ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevoke(feed)}>
                              Revogar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <ToggleRow
                      id={`${feed.id}-services`}
                      label="Cultos"
                      checked={feed.includeServices}
                      onCheckedChange={(value) => handleToggle(feed, "includeServices", value)}
                      disabled={isPending}
                    />
                    <ToggleRow
                      id={`${feed.id}-rehearsals`}
                      label="Ensaios"
                      checked={feed.includeRehearsals}
                      onCheckedChange={(value) => handleToggle(feed, "includeRehearsals", value)}
                      disabled={isPending}
                    />
                    <ToggleRow
                      id={`${feed.id}-department-events`}
                      label="Eventos do depto."
                      checked={feed.includeDepartmentEvents}
                      onCheckedChange={(value) => handleToggle(feed, "includeDepartmentEvents", value)}
                      disabled={isPending}
                    />
                    <ToggleRow
                      id={`${feed.id}-assignments`}
                      label="Minhas escalas"
                      checked={feed.includeAssignments}
                      onCheckedChange={(value) => handleToggle(feed, "includeAssignments", value)}
                      disabled={isPending}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2">
      <Label htmlFor={id} className="cursor-pointer text-xs sm:text-sm">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}
