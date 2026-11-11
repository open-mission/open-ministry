import Link from "next/link";
import {
  ArrowRightIcon,
  HeartHandshakeIcon,
  MessageCircleIcon,
  SparklesIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  MOOD_LEVELS,
  type MoodOverview,
} from "@/lib/felicitometro-types";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PastoralCarePreview({
  overview,
  className,
}: {
  overview: MoodOverview;
  className?: string;
}) {
  const roundedScore = Math.min(
    5,
    Math.max(1, Math.round(overview.averageScore) || 4),
  );
  const moodDef = MOOD_LEVELS[roundedScore];
  const hasRequests = overview.recentCareRequests.length > 0;
  const topRequests = overview.recentCareRequests.slice(0, 3);

  return (
    <Card className={cn("overflow-hidden border-border/70 bg-card", className)}>
      <CardHeader className="flex flex-col gap-2 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <HeartHandshakeIcon className="size-4" aria-hidden="true" />
            </span>
            <CardTitle className="font-heading text-lg tracking-tight sm:text-xl">
              Cuidado pastoral & Felicitômetro
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Termômetro emocional e espiritual da equipe nos últimos 14 dias.
          </CardDescription>
        </div>

        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 self-start text-xs sm:self-auto">
          <Link href="/dashboard/members?tab=felicitometro" prefetch={true}>
            <span>Painel completo</span>
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-5 p-5 sm:p-6">
        {/* Métricas rápidas (2x2) */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1 rounded-xl border border-border/60 bg-muted/40 p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              Média de humor
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xl" role="img" aria-label="Humor médio">
                {moodDef.emoji}
              </span>
              <span className="font-heading text-lg font-bold tracking-tight tabular-nums">
                {overview.totalCheckIns > 0 ? overview.averageScore.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">/ 5.0</span>
            </div>
          </div>

          <div className="space-y-1 rounded-xl border border-border/60 bg-muted/40 p-3.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              Check-ins
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-xl font-bold tracking-tight tabular-nums">
                {overview.totalCheckIns}
              </span>
              <span className="text-xs text-muted-foreground">registros</span>
            </div>
          </div>

          <div className={cn(
            "space-y-1 rounded-xl border p-3.5 transition-colors",
            overview.prayerRequestsCount > 0
              ? "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200"
              : "border-border/60 bg-muted/40",
          )}>
            <p className="text-[11px] font-medium text-muted-foreground">
              Pedidos de oração
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-base" aria-hidden="true">🙏</span>
              <span className="font-heading text-xl font-bold tracking-tight tabular-nums">
                {overview.prayerRequestsCount}
              </span>
              <span className="text-xs text-muted-foreground">
                {overview.prayerRequestsCount === 1 ? "pedido" : "pedidos"}
              </span>
            </div>
          </div>

          <div className={cn(
            "space-y-1 rounded-xl border p-3.5 transition-colors",
            overview.talkRequestsCount > 0
              ? "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-200"
              : "border-border/60 bg-muted/40",
          )}>
            <p className="text-[11px] font-medium text-muted-foreground">
              Querem conversar
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-base" aria-hidden="true">💬</span>
              <span className="font-heading text-xl font-bold tracking-tight tabular-nums">
                {overview.talkRequestsCount}
              </span>
              <span className="text-xs text-muted-foreground">
                {overview.talkRequestsCount === 1 ? "pessoa" : "pessoas"}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de pessoas precisando de apoio */}
        {hasRequests ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Membros precisando de carinho & contato
              </h3>
              <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-[0.65rem] font-normal text-rose-600 dark:text-rose-400 tabular-nums">
                {overview.recentCareRequests.length} no total
              </Badge>
            </div>

            <div className="space-y-2.5">
              {topRequests.map((req) => {
                const phoneClean = req.personPhone
                  ? req.personPhone.replace(/\D/g, "")
                  : null;
                const level = MOOD_LEVELS[req.score] ?? MOOD_LEVELS[3];

                return (
                  <div
                    key={req.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar className="size-10 shrink-0 border">
                        <AvatarImage
                          src={req.personImage ?? undefined}
                          alt={req.personName}
                        />
                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                          {getInitials(req.personName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {req.personName}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-medium border",
                              level.bg,
                              level.color,
                              level.border,
                            )}
                          >
                            <span>{level.emoji}</span>
                            <span>{level.shortLabel}</span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {req.needsPrayer && (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[0.65rem] py-0"
                            >
                              🙏 Pediu oração
                            </Badge>
                          )}
                          {req.needsTalk && (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[0.65rem] py-0"
                            >
                              💬 Pediu conversa
                            </Badge>
                          )}
                          {req.notes && (
                            <p className="text-xs text-muted-foreground italic line-clamp-1 w-full mt-0.5">
                              &ldquo;{req.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {phoneClean && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-8 gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                          <a
                            href={`https://wa.me/55${phoneClean}?text=Ol%C3%A1%20${encodeURIComponent(req.personName)}%2C%20vi%20seu%20recado%20no%20app%20da%20igreja.%20Como%20voc%C3%AA%20est%C3%A1%3F`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircleIcon className="size-3.5" aria-hidden="true" />
                            WhatsApp
                          </a>
                        </Button>
                      )}

                      <Button size="sm" variant="ghost" asChild className="h-8 gap-1 text-xs">
                        <Link href={`/dashboard/members/${req.personId}`} prefetch={true}>
                          <span>Perfil</span>
                          <ArrowRightIcon className="size-3" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-emerald-900 dark:text-emerald-200">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <SparklesIcon className="size-4" aria-hidden="true" />
            </span>
            <p className="text-xs leading-relaxed">
              Tudo em paz por aqui! Nenhum pedido urgente de oração ou conversa registrado recentemente. Continue cuidando e incentivando sua equipe.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
