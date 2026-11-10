"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  HeartHandshakeIcon,
  MessageSquareHeartIcon,
  PencilIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  submitDailyMoodAction,
  type SubmitMoodState,
} from "@/app/actions/felicitometro";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { MOOD_LEVELS } from "@/lib/felicitometro-types";
import { cn } from "@/lib/utils";

export type InitialMoodData = {
  score: number;
  needsPrayer: boolean;
  needsTalk: boolean;
  notes: string | null;
  date: string;
} | null;

export function FelicitometroCard({
  initialMood,
  userName,
  className,
}: {
  initialMood?: InitialMoodData;
  userName?: string;
  className?: string;
}) {
  const [isEditing, setIsEditing] = useState(!initialMood);
  const [selectedScore, setSelectedScore] = useState<number>(
    initialMood?.score ?? 4,
  );
  const [needsPrayer, setNeedsPrayer] = useState(
    initialMood?.needsPrayer ?? false,
  );
  const [needsTalk, setNeedsTalk] = useState(
    initialMood?.needsTalk ?? false,
  );
  const [notes, setNotes] = useState(initialMood?.notes ?? "");

  const [state, formAction] = useActionState<SubmitMoodState, FormData>(
    submitDailyMoodAction,
    undefined,
  );
  const handled = useRef(false);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success("Seu sentimento foi registrado com sucesso!");
      setIsEditing(false);
    }
  }, [state]);

  const activeMood = MOOD_LEVELS[selectedScore];

  return (
    <Card className={cn("relative overflow-hidden border-primary/15 bg-card shadow-xs", className)}>
      <CardHeader className="px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SparklesIcon className="size-4" />
            </span>
            <div>
              <CardTitle className="font-heading text-lg leading-snug tracking-tight sm:text-xl">
                Como você está hoje{userName ? `, ${userName}` : ""}?
              </CardTitle>
              <CardDescription className="mt-1 text-xs leading-relaxed">
                Check-in diário • Visível apenas para sua liderança e pastores.
              </CardDescription>
            </div>
          </div>

          {!isEditing && initialMood ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handled.current = false;
                setIsEditing(true);
              }}
              className="h-9 shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <PencilIcon className="size-3" />
              Editar
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
        {!isEditing && initialMood ? (
          <div className="space-y-3 rounded-xl border bg-background/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl" role="img" aria-label={activeMood.label}>
                  {activeMood.emoji}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {activeMood.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Registrado hoje para a liderança
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {initialMood.needsPrayer && (
                  <Badge variant="secondary" className="gap-1 text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <HeartHandshakeIcon className="size-3" />
                    Oração solicitada
                  </Badge>
                )}
                {initialMood.needsTalk && (
                  <Badge variant="secondary" className="gap-1 text-[11px] bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    <MessageSquareHeartIcon className="size-3" />
                    Quer conversar
                  </Badge>
                )}
              </div>
            </div>

            {initialMood.notes && (
              <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground italic">
                &ldquo;{initialMood.notes}&rdquo;
              </div>
            )}

            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              Obrigado por compartilhar seu coração! Sua liderança cuida e ora por você.
            </p>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="score" value={selectedScore} />
            <input
              type="hidden"
              name="needsPrayer"
              value={needsPrayer ? "true" : "false"}
            />
            <input
              type="hidden"
              name="needsTalk"
              value={needsTalk ? "true" : "false"}
            />

            {/* Escala de Sentimentos 1 a 5 */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {[1, 2, 3, 4, 5].map((score) => {
                const item = MOOD_LEVELS[score];
                const isSelected = selectedScore === score;

                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setSelectedScore(score)}
                    aria-pressed={isSelected}
                    className={`group flex min-h-[72px] flex-col items-center justify-center rounded-xl p-2.5 text-center transition-[transform,background-color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                      isSelected
                        ? `${item.bg} ${item.border} border-2 shadow-xs ring-1 ring-primary/40 scale-[1.03]`
                        : "border border-border/60 bg-card text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span className="text-2xl transition-transform duration-150 group-hover:scale-110 motion-reduce:transition-none sm:text-3xl">
                      {item.emoji}
                    </span>
                    <span
                      className={`mt-1.5 text-[10px] font-medium leading-tight sm:text-xs ${
                        isSelected ? item.color : "text-muted-foreground"
                      }`}
                    >
                      {item.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-center font-medium text-foreground">
              Sentindo-se:{" "}
              <span className={activeMood.color}>
                {activeMood.emoji} {activeMood.label}
              </span>
            </p>

            {/* Opções Pastorais de Cuidado */}
            <div className="space-y-1 rounded-xl border bg-muted/20 p-2 text-sm">
              <label
                htmlFor="check-prayer"
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1.5 py-2 text-foreground transition-colors active:bg-muted/50"
              >
                <Checkbox
                  id="check-prayer"
                  checked={needsPrayer}
                  onCheckedChange={(checked) =>
                    setNeedsPrayer(Boolean(checked))
                  }
                />
                <div className="flex items-center gap-2 font-medium">
                  <HeartHandshakeIcon className="size-4 shrink-0 text-amber-500" />
                  <span className="text-sm leading-snug">
                    Gostaria de uma oração da minha liderança
                  </span>
                </div>
              </label>

              <label
                htmlFor="check-talk"
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1.5 py-2 text-foreground transition-colors active:bg-muted/50"
              >
                <Checkbox
                  id="check-talk"
                  checked={needsTalk}
                  onCheckedChange={(checked) =>
                    setNeedsTalk(Boolean(checked))
                  }
                />
                <div className="flex items-center gap-2 font-medium">
                  <MessageSquareHeartIcon className="size-4 shrink-0 text-blue-500" />
                  <span className="text-sm leading-snug">
                    Preciso conversar com um líder ou pastor
                  </span>
                </div>
              </label>
            </div>

            {/* Campo Opcional de Mensagem */}
            <div className="space-y-2">
              <label
                htmlFor="mood-notes"
                className="text-sm font-medium text-muted-foreground"
              >
                Quer compartilhar algo com seus líderes? (Opcional, privado)
              </label>
              <Textarea
                id="mood-notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Como tem sido sua semana? Algum motivo de gratidão ou pedido específico..."
                rows={3}
                maxLength={300}
                className="resize-none text-sm sm:text-xs"
              />
            </div>

            {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {initialMood ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-10 w-full text-sm sm:h-9 sm:w-auto sm:text-xs"
                >
                  Cancelar
                </Button>
              ) : null}
              <SubmitButton
                size="sm"
                pendingLabel="Salvando..."
                className="h-10 w-full px-4 text-sm sm:h-9 sm:w-auto sm:text-xs"
              >
                Registrar sentimento
              </SubmitButton>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
