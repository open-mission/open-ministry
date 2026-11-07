"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRightIcon,
  HeartHandshakeIcon,
  MessageCircleIcon,
  MessageSquareHeartIcon,
  SparklesIcon,
  TrendingUpIcon,
  UsersIcon,
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
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { MOOD_LEVELS, type MoodOverview } from "@/lib/felicitometro-types";
import { getInitials } from "@/lib/format";

const timelineConfig: ChartConfig = {
  averageScore: {
    label: "Média de Sentimento",
    color: "hsl(var(--primary))",
  },
  count: {
    label: "Participantes",
    color: "hsl(var(--muted-foreground))",
  },
};

const barConfig: ChartConfig = {
  count: {
    label: "Respostas",
    color: "hsl(var(--primary))",
  },
};

export function FelicitometroDashboard({
  overview,
  title = "Saúde Emocional & Cuidado Pastoral",
  subtitle = "Acompanhamento confidencial dos sentimentos da equipe e pedidos de oração.",
}: {
  overview: MoodOverview;
  title?: string;
  subtitle?: string;
}) {
  const {
    averageScore,
    totalCheckIns,
    prayerRequestsCount,
    talkRequestsCount,
    dailyTimeline,
    scoreDistribution,
    recentCareRequests,
  } = overview;

  return (
    <div className="space-y-6">
      {title && (
        <div className="space-y-1">
          <h2 className="font-heading text-xl tracking-tight font-semibold">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}

      {/* Header & Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Card 1: Média */}
        <Card className="rounded-xl border shadow-2xs">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-xs font-medium">
              Média Geral
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {averageScore > 0 ? averageScore.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-muted-foreground">/ 5.0</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUpIcon className="size-3 text-emerald-500" />
              <span>
                {averageScore >= 4
                  ? "Equipe em paz e alegre"
                  : averageScore >= 3
                    ? "Equipe estável"
                    : "Requer atenção pastoral"}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Total Check-ins */}
        <Card className="rounded-xl border shadow-2xs">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-xs font-medium">
              Check-ins (14 dias)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {totalCheckIns}
              </span>
              <span className="text-xs text-muted-foreground">registros</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Engajamento diário dos membros
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Pedidos de Oração */}
        <Card className="rounded-xl border shadow-2xs bg-amber-500/5 border-amber-500/20">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Pedidos de Oração
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-amber-900 dark:text-amber-200">
                {prayerRequestsCount}
              </span>
              <span className="text-xs text-amber-700/80 dark:text-amber-300/80">
                pedidos
              </span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
              <HeartHandshakeIcon className="size-3" />
              <span>Gostariam de oração</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Pedidos de Conversa */}
        <Card className="rounded-xl border shadow-2xs bg-blue-500/5 border-blue-500/20">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-xs font-medium text-blue-800 dark:text-blue-300">
              Querem Conversar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-blue-900 dark:text-blue-200">
                {talkRequestsCount}
              </span>
              <span className="text-xs text-blue-700/80 dark:text-blue-300/80">
                pessoas
              </span>
            </div>
            <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1 flex items-center gap-1">
              <MessageSquareHeartIcon className="size-3" />
              <span>Solicitaram contato</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos com shadcn/ui */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Evolução Temporal */}
        <Card className="lg:col-span-2 rounded-2xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg">
              Evolução Temporal do Sentimento
            </CardTitle>
            <CardDescription className="text-xs">
              Média diária das respostas registradas nos últimos 14 dias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalCheckIns === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center text-center p-6 text-muted-foreground text-xs">
                <SparklesIcon className="size-8 opacity-40 mb-2" />
                <p>Nenhum check-in registrado nos últimos dias.</p>
              </div>
            ) : (
              <ChartContainer config={timelineConfig} className="h-60 w-full">
                <AreaChart
                  data={dailyTimeline}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-averageScore)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-averageScore)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="displayDate"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="averageScore"
                    stroke="var(--color-averageScore)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#scoreGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico 2: Distribuição */}
        <Card className="rounded-2xl shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg">
              Distribuição dos Sentimentos
            </CardTitle>
            <CardDescription className="text-xs">
              Contagem de respostas por nível emocional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalCheckIns === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center text-center p-6 text-muted-foreground text-xs">
                <UsersIcon className="size-8 opacity-40 mb-2" />
                <p>Sem dados de distribuição.</p>
              </div>
            ) : (
              <ChartContainer config={barConfig} className="h-60 w-full">
                <BarChart
                  data={scoreDistribution}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {scoreDistribution.map((entry) => (
                      <Cell key={entry.score} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Atenção Pastoral & Pedidos de Oração */}
      <Card className="rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <HeartHandshakeIcon className="size-4" />
              </span>
              <div>
                <CardTitle className="font-heading text-lg">
                  Atenção Pastoral Recente
                </CardTitle>
                <CardDescription className="text-xs">
                  Membros que solicitaram oração, conversa ou relataram dias difíceis.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {recentCareRequests.length} solicitações
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y">
          {recentCareRequests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              <SparklesIcon className="size-6 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-foreground">
                Nenhum pedido de oração ou atenção crítica pendente.
              </p>
              <p className="mt-1">
                A equipe está servindo bem e com acompanhamento em dia!
              </p>
            </div>
          ) : (
            recentCareRequests.map((req) => {
              const moodDef = MOOD_LEVELS[req.score];
              const phoneClean = req.personPhone?.replace(/\D/g, "");

              return (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar className="size-10 shrink-0 border">
                      <AvatarImage src={req.personImage || undefined} alt={req.personName} />
                      <AvatarFallback className="text-xs font-medium">
                        {getInitials(req.personName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/members/${req.personId}`}
                          className="font-medium text-sm text-foreground hover:underline"
                        >
                          {req.personName}
                        </Link>
                        <span className="text-lg shrink-0" title={moodDef.label}>
                          {moodDef.emoji}
                        </span>
                        {req.needsPrayer && (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-[10px] py-0 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          >
                            <HeartHandshakeIcon className="size-3" />
                            Oração
                          </Badge>
                        )}
                        {req.needsTalk && (
                          <Badge
                            variant="secondary"
                            className="gap-1 text-[10px] py-0 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          >
                            <MessageSquareHeartIcon className="size-3" />
                            Conversa
                          </Badge>
                        )}
                      </div>

                      {req.notes ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          &ldquo;{req.notes}&rdquo;
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {req.departmentNames.length > 0
                            ? req.departmentNames.join(", ")
                            : "Membro da igreja"}
                        </p>
                      )}

                      <span className="text-[11px] text-muted-foreground/80 block">
                        Registrado em {req.date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {phoneClean && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-8 text-xs gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        <a
                          href={`https://wa.me/55${phoneClean}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircleIcon className="size-3.5" />
                          WhatsApp
                        </a>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="default"
                      asChild
                      className="h-8 text-xs gap-1"
                    >
                      <Link href={`/dashboard/members/${req.personId}`}>
                        <span>Ver Perfil</span>
                        <ArrowRightIcon className="size-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
