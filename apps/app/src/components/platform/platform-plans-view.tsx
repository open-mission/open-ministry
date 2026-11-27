"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  LayersIcon,
  Loader2Icon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  XCircleIcon,
} from "lucide-react";

import {
  listPlatformPlansAction,
  savePlatformPlanAction,
  type PlatformPlanView,
} from "@/app/actions/platform";
import { ResponsiveDialog } from "@/components/app/responsive-dialog";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/format";

type PlatformPlansViewProps = {
  initialPlans: PlatformPlanView[];
};

type PlanFormState = {
  id?: string;
  name: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  whatsappNotifications: boolean;
  whatsappMaxInstances: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
};

function createEmptyForm(): PlanFormState {
  return {
    name: "",
    slug: "",
    slugTouched: false,
    description: "",
    whatsappNotifications: false,
    whatsappMaxInstances: 0,
    isActive: true,
    isDefault: false,
    sortOrder: 0,
  };
}

function formFromPlan(plan: PlatformPlanView): PlanFormState {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    slugTouched: true,
    description: plan.description ?? "",
    whatsappNotifications: plan.features.whatsapp_notifications,
    whatsappMaxInstances: plan.features.whatsapp_max_instances,
    isActive: plan.isActive,
    isDefault: plan.isDefault,
    sortOrder: plan.sortOrder,
  };
}

export function PlatformPlansView({ initialPlans }: PlatformPlansViewProps) {
  const [plans, setPlans] = useState(
    [...initialPlans].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PlanFormState>(createEmptyForm);
  const [isSaving, startSaving] = useTransition();

  function openCreate() {
    setForm(createEmptyForm());
    setDialogOpen(true);
  }

  function openEdit(plan: PlatformPlanView) {
    setForm(formFromPlan(plan));
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Nome e slug do plano são obrigatórios.");
      return;
    }

    startSaving(async () => {
      const res = await savePlatformPlanAction({
        id: form.id,
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description.trim() || null,
        features: {
          whatsapp_notifications: form.whatsappNotifications,
          whatsapp_max_instances: form.whatsappNotifications
            ? Math.max(1, Number(form.whatsappMaxInstances) || 1)
            : Number(form.whatsappMaxInstances) || 0,
        },
        isActive: form.isActive,
        isDefault: form.isDefault,
        sortOrder: Number(form.sortOrder) || 0,
      });

      if (!res.ok) {
        toast.error(res.error || "Não foi possível salvar o plano.");
        return;
      }

      const refreshed = await listPlatformPlansAction();
      setPlans([...refreshed].sort((a, b) => a.sortOrder - b.sortOrder));
      setDialogOpen(false);
      toast.success(form.id ? "Plano atualizado!" : "Plano criado!");
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Planos e Recursos
          </h1>
          <p className="text-sm text-muted-foreground">
            Defina quais recursos e limites cada plano libera por padrão para as
            igrejas da plataforma.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreate}
          className="min-h-11 gap-2 sm:min-h-9"
        >
          <PlusIcon className="size-4" />
          Novo plano
        </Button>
      </header>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <LayersIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-heading text-lg font-semibold">
                Nenhum plano cadastrado
              </p>
              <p className="text-sm text-muted-foreground">
                Crie planos iniciais como Gratuito, Pro e Enterprise para organizar
                entitlements.
              </p>
            </div>
            <Button onClick={openCreate} className="min-h-11 gap-2 sm:min-h-9">
              <PlusIcon className="size-4" />
              Criar primeiro plano
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col justify-between">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="font-heading text-xl tracking-tight">
                        {plan.name}
                      </CardTitle>
                      {plan.isDefault ? (
                        <Badge className="text-[11px]">Padrão</Badge>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className="font-mono text-[11px] font-normal"
                    >
                      {plan.slug}
                    </Badge>
                  </div>

                  <Badge
                    variant={plan.isActive ? "secondary" : "outline"}
                    className="text-[11px]"
                  >
                    {plan.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <CardDescription className="text-xs leading-relaxed">
                  {plan.description || "Sem descrição cadastrada."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquareIcon className="size-3.5" />
                      WhatsApp automático
                    </span>
                    {plan.features.whatsapp_notifications ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2Icon className="size-3.5" />
                        Liberado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <XCircleIcon className="size-3.5" />
                        Bloqueado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      Instâncias simultâneas
                    </span>
                    <span className="font-mono font-medium text-foreground">
                      {plan.features.whatsapp_max_instances}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Ordem</span>
                    <span className="font-mono text-foreground">
                      #{plan.sortOrder}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openEdit(plan)}
                  className="min-h-11 w-full gap-2 sm:min-h-9"
                >
                  <PencilIcon className="size-3.5" />
                  Editar plano
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ResponsiveDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          if (!isSaving) setDialogOpen(next);
        }}
        title={form.id ? "Editar plano" : "Novo plano"}
        description="Configure entitlements e limites padrão aplicados às igrejas vinculadas a este plano."
        contentClassName="sm:max-w-lg"
        footer={
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setDialogOpen(false)}
              className="min-h-11 sm:min-h-9"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="platform-plan-form"
              disabled={isSaving}
              className="min-h-11 gap-2 sm:min-h-9"
            >
              {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Salvar plano
            </Button>
          </div>
        }
      >
        <form id="platform-plan-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Nome *</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    slug: prev.slugTouched ? prev.slug : slugify(name),
                  }));
                }}
                placeholder="Ex.: Pro"
                required
                className="min-h-11 sm:min-h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-slug">Slug *</Label>
              <Input
                id="plan-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    slugTouched: true,
                    slug: slugify(e.target.value),
                  }))
                }
                placeholder="Ex.: pro"
                required
                className="min-h-11 font-mono text-xs sm:min-h-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">Descrição</Label>
            <Textarea
              id="plan-description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={2}
              placeholder="Resumo comercial ou operacional do plano."
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label
                  htmlFor="plan-wa-enabled"
                  className="text-sm font-medium cursor-pointer"
                >
                  Liberar WhatsApp gerenciado
                </Label>
                <p className="text-xs text-muted-foreground">
                  Permite criar instância e escanear QR Code sem override manual.
                </p>
              </div>
              <Switch
                id="plan-wa-enabled"
                checked={form.whatsappNotifications}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    whatsappNotifications: checked,
                    whatsappMaxInstances:
                      checked && prev.whatsappMaxInstances === 0
                        ? 1
                        : !checked
                          ? 0
                          : prev.whatsappMaxInstances,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plan-wa-max" className="text-xs">
                  Máximo de instâncias
                </Label>
                <Input
                  id="plan-wa-max"
                  type="number"
                  min={0}
                  max={20}
                  value={form.whatsappMaxInstances}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      whatsappMaxInstances: Number(e.target.value) || 0,
                    }))
                  }
                  className="min-h-11 font-mono sm:min-h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plan-sort" className="text-xs">
                  Ordem de exibição
                </Label>
                <Input
                  id="plan-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sortOrder: Number(e.target.value) || 0,
                    }))
                  }
                  className="min-h-11 font-mono sm:min-h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isActive: checked }))
                }
              />
              <span>Plano ativo</span>
            </label>

            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <Switch
                checked={form.isDefault}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, isDefault: checked }))
                }
              />
              <span>Plano padrão de novas igrejas</span>
            </label>
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  );
}
