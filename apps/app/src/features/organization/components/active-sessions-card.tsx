"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  GlobeIcon,
  LaptopIcon,
  Loader2Icon,
  LogOutIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from "lucide-react";

import {
  revokeOtherSessionsAction,
  revokeSessionAction,
  type SessionItem,
} from "@/app/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";

type ActiveSessionsCardProps = {
  initialSessions: SessionItem[];
};

function parseUserAgent(ua: string | null): { name: string; isMobile: boolean } {
  if (!ua) return { name: "Navegador desconhecido", isMobile: false };

  const isMobile = /mobile|iphone|ipad|android/i.test(ua);

  let browser = "Navegador web";
  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) browser = "Google Chrome";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Apple Safari";
  else if (/firefox/i.test(ua)) browser = "Mozilla Firefox";
  else if (/edg/i.test(ua)) browser = "Microsoft Edge";

  let os = "Desktop";
  if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  return { name: `${browser} no ${os}`, isMobile };
}

export function ActiveSessionsCard({ initialSessions }: ActiveSessionsCardProps) {
  const [sessions, setSessions] = useState<SessionItem[]>(initialSessions);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const hasOtherSessions = sessions.some((s) => !s.isCurrent);

  async function handleRevokeSession(sessionId: string) {
    setRevokingId(sessionId);
    try {
      const res = await revokeSessionAction(sessionId);
      if (!res.success) {
        toast.error(res.error || "Não foi possível revogar a sessão.");
        return;
      }
      toast.success("Sessão desconectada com sucesso.");
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      toast.error("Erro ao revogar sessão.");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRevokeOtherSessions() {
    setRevokingOthers(true);
    try {
      const res = await revokeOtherSessionsAction();
      if (!res.success) {
        toast.error(res.error || "Não foi possível revogar outras sessões.");
        return;
      }
      toast.success("Todos os outros dispositivos foram desconectados.");
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch {
      toast.error("Erro ao desconectar outros dispositivos.");
    } finally {
      setRevokingOthers(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-heading text-xl tracking-tight">
            Dispositivos e Sessões Ativas
          </CardTitle>
          <CardDescription>
            Veja onde sua conta está conectada e encerre acessos que não reconhece.
          </CardDescription>
        </div>

        {hasOtherSessions ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevokeOtherSessions}
            disabled={revokingOthers}
            className="shrink-0 gap-1.5"
          >
            {revokingOthers ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <LogOutIcon className="size-3.5" />
            )}
            Encerrar outras sessões
          </Button>
        ) : null}
      </CardHeader>

      <CardContent>
        <div className="divide-y rounded-lg border">
          {sessions.map((s) => {
            const { name, isMobile } = parseUserAgent(s.userAgent);
            const Icon = isMobile ? SmartphoneIcon : LaptopIcon;

            return (
              <div
                key={s.id}
                className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{name}</span>
                      {s.isCurrent ? (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20 text-[10px]"
                        >
                          <ShieldCheckIcon className="size-3 mr-1" />
                          Esta sessão
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {s.ipAddress ? (
                        <span className="flex items-center gap-1">
                          <GlobeIcon className="size-3" />
                          {s.ipAddress}
                        </span>
                      ) : null}
                      <span>·</span>
                      <span>Conectado em {formatDate(new Date(s.createdAt))}</span>
                    </div>
                  </div>
                </div>

                {!s.isCurrent ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-end text-xs text-muted-foreground hover:text-destructive sm:self-center"
                    disabled={revokingId === s.id}
                    onClick={() => handleRevokeSession(s.id)}
                  >
                    {revokingId === s.id ? (
                      <Loader2Icon className="size-3 animate-spin mr-1" />
                    ) : (
                      <LogOutIcon className="size-3 mr-1" />
                    )}
                    Desconectar
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
