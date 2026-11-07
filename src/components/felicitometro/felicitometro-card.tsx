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
}: {
  initialMood?: InitialMoodData;
  userName?: string;
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
    <Card className="relative overflow-hidden border-primary/20 shadow-xs bg-gradient-to-b from-card to-muted/20">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-500 to-primary" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SparklesIcon className="size-4" />
            </span>
            <div>
              <CardTitle className="font-heading text-lg tracking-tight">
                Como você está hoje{userName ? `, ${userName}` : ""}?
              </CardTitle>
              <CardDescription className="text-xs">
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
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <PencilIcon className="size-3" />
              Editar
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isEditing && initialMood ? (
          <div className="rounded-xl border bg-background/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
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
                    className={`group flex flex-col items-center justify-center rounded-xl p-2.5 transition-all text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? `${item.bg} ${item.border} border-2 shadow-xs ring-1 ring-primary/40 scale-[1.03]`
                        : "border border-border/60 bg-card hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl transition-transform group-hover:scale-110">
                      {item.emoji}
                    </span>
                    <span
                      className={`text-[10px] sm:text-xs font-medium mt-1.5 leading-tight ${
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
            <div className="rounded-xl border bg-muted/20 p-3 space-y-2.5 text-xs">
              <label
                htmlFor="check-prayer"
                className="flex items-center gap-2.5 cursor-pointer text-foreground"
              >
                <Checkbox
                  id="check-prayer"
                  checked={needsPrayer}
                  onCheckedChange={(checked) =>
                    setNeedsPrayer(Boolean(checked))
                  }
                />
                <div className="flex items-center gap-1.5 font-medium">
                  <HeartHandshakeIcon className="size-3.5 text-amber-500" />
                  <span>Gostaria de uma oração da minha liderança</span>
                </div>
              </label>

              <label
                htmlFor="check-talk"
                className="flex items-center gap-2.5 cursor-pointer text-foreground"
              >
                <Checkbox
                  id="check-talk"
                  checked={needsTalk}
                  onCheckedChange={(checked) =>
                    setNeedsTalk(Boolean(checked))
                  }
                />
                <div className="flex items-center gap-1.5 font-medium">
                  <MessageSquareHeartIcon className="size-3.5 text-blue-500" />
                  <span>Preciso conversar com um líder ou pastor</span>
                </div>
              </label>
            </div>

            {/* Campo Opcional de Mensagem */}
            <div className="space-y-1.5">
              <label
                htmlFor="mood-notes"
                className="text-xs font-medium text-muted-foreground"
              >
                Quer compartilhar algo com seus líderes? (Opcional, privado)
              </label>
              <Textarea
                id="mood-notes"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Como tem sido sua semana? Algum motivo de gratidão ou pedido específico..."
                rows={2}
                maxLength={300}
                className="text-xs resize-none"
              />
            </div>

            {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

            <div className="flex items-center justify-end gap-2">
              {initialMood ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-8 text-xs"
                >
                  Cancelar
                </Button>
              ) : null}
              <SubmitButton
                size="sm"
                pendingLabel="Salvando..."
                className="h-8 text-xs px-4"
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
