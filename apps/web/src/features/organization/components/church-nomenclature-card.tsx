"use client";

import { useState, useTransition } from "react";
import {
  CheckIcon,
  LayersIcon,
  SaveIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { updateChurchNomenclatureAction } from "@/app/actions/church";
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
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NOMENCLATURE_PRESETS,
  type DepartmentNomenclature,
  type DepartmentNomenclatureType,
} from "@/lib/church";
import { cn } from "@/lib/utils";

type ChurchNomenclatureCardProps = {
  initialNomenclature?: DepartmentNomenclature;
};

export function ChurchNomenclatureCard({
  initialNomenclature,
}: ChurchNomenclatureCardProps) {
  const [isPending, startTransition] = useTransition();

  const [selectedType, setSelectedType] = useState<DepartmentNomenclatureType>(
    initialNomenclature?.type || "departments",
  );
  const [singular, setSingular] = useState(
    initialNomenclature?.singular || "Departamento",
  );
  const [plural, setPlural] = useState(
    initialNomenclature?.plural || "Departamentos",
  );

  function handleSelectPreset(presetKey: Exclude<DepartmentNomenclatureType, "custom">) {
    const preset = NOMENCLATURE_PRESETS[presetKey];
    setSelectedType(presetKey);
    setSingular(preset.singular);
    setPlural(preset.plural);
  }

  function handleSelectCustom() {
    setSelectedType("custom");
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!singular.trim() || !plural.trim()) {
      toast.error("Preencha os termos no singular e no plural.");
      return;
    }

    startTransition(async () => {
      const result = await updateChurchNomenclatureAction({
        type: selectedType,
        singular: singular.trim(),
        plural: plural.trim(),
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Nomenclatura da igreja atualizada com sucesso!");
    });
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 font-normal text-xs">
            <LayersIcon className="size-3 text-primary" />
            Estrutura Organizacional
          </Badge>
        </div>
        <CardTitle className="font-heading text-xl tracking-tight">
          Nomenclatura dos Grupos e Equipes
        </CardTitle>
        <CardDescription>
          Escolha como sua igreja chama as equipes de trabalho e serviço (ex: Ministérios, Departamentos ou Equipes). Essa escolha personaliza os títulos, botões e atalhos em todo o sistema.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Grade de Presets */}
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Selecione o modelo mais comum na sua igreja
            </span>

            <div className="grid gap-3 sm:grid-cols-2">
              {(
                Object.keys(NOMENCLATURE_PRESETS) as Array<
                  Exclude<DepartmentNomenclatureType, "custom">
                >
              ).map((key) => {
                const preset = NOMENCLATURE_PRESETS[key];
                const isSelected = selectedType === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectPreset(key)}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-xs"
                        : "border-border/70 hover:border-primary/40 hover:bg-muted/30",
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-heading text-sm font-semibold text-foreground">
                        {preset.label}
                      </span>
                      {isSelected ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <CheckIcon className="size-3" />
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {preset.description}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-muted-foreground/80">
                      <span>Singular: <strong>{preset.singular}</strong></span>
                      <span>·</span>
                      <span>Plural: <strong>{preset.plural}</strong></span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Opção Personalizada */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleSelectCustom}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all",
                  selectedType === "custom"
                    ? "border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-xs"
                    : "border-border/70 hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                <div>
                  <span className="font-heading text-sm font-semibold text-foreground">
                    Personalizado / Outro termo
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Defina termos específicos utilizados pela sua comunidade (ex: Células, Frentes, Times, etc.)
                  </p>
                </div>
                {selectedType === "custom" ? (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-3" />
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {/* Campos de Edição */}
          <FieldGroup className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
            <Field>
              <FieldLabel htmlFor="nom-singular">
                Termo no Singular
              </FieldLabel>
              <Input
                id="nom-singular"
                value={singular}
                onChange={(e) => {
                  setSingular(e.target.value);
                  setSelectedType("custom");
                }}
                placeholder="Ex: Departamento ou Ministério"
                maxLength={40}
              />
              <span className="text-[11px] text-muted-foreground">
                Usado em botões como &quot;Novo {singular || "..."}&quot;
              </span>
            </Field>

            <Field>
              <FieldLabel htmlFor="nom-plural">
                Termo no Plural
              </FieldLabel>
              <Input
                id="nom-plural"
                value={plural}
                onChange={(e) => {
                  setPlural(e.target.value);
                  setSelectedType("custom");
                }}
                placeholder="Ex: Departamentos ou Ministérios"
                maxLength={40}
              />
              <span className="text-[11px] text-muted-foreground">
                Usado em títulos como &quot;Acessar {plural || "..."}&quot;
              </span>
            </Field>
          </FieldGroup>

          {/* Pré-visualização ao vivo */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <SparklesIcon className="size-3.5" />
              <span>Pré-visualização na interface</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg border bg-card px-3 py-1.5 text-xs shadow-2xs">
                <span className="text-muted-foreground">Botão:</span>{" "}
                <span className="font-medium text-foreground">Novo {singular}</span>
              </div>
              <div className="rounded-lg border bg-card px-3 py-1.5 text-xs shadow-2xs">
                <span className="text-muted-foreground">Menu:</span>{" "}
                <span className="font-medium text-foreground">{plural}</span>
              </div>
              <div className="rounded-lg border bg-card px-3 py-1.5 text-xs shadow-2xs">
                <span className="text-muted-foreground">Atalho rápido:</span>{" "}
                <span className="font-medium text-foreground">{plural}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending} className="gap-2">
              <SaveIcon className="size-4" />
              {isPending ? "Salvando..." : "Salvar nomenclatura"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
