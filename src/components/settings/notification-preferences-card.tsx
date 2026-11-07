"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { BellIcon, ExternalLinkIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export function NotificationPreferencesCard() {
  const [scheduleAlerts, setScheduleAlerts] = useState(true);
  const [churchAnnouncements, setChurchAnnouncements] = useState(true);
  const [birthdayReminders, setBirthdayReminders] = useState(true);

  function handleToggle(
    name: string,
    value: boolean,
    setter: (val: boolean) => void,
  ) {
    setter(value);
    toast.success(`Preferência de ${name} ${value ? "ativada" : "desativada"}.`);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-heading text-xl tracking-tight">
            Preferências de Notificações
          </CardTitle>
          <CardDescription>
            Escolha os avisos que você deseja receber no sino e na barra de notificações do painel.
          </CardDescription>
        </div>

        <Button variant="outline" size="sm" asChild className="gap-1.5 shrink-0">
          <Link href="/dashboard/notifications">
            <BellIcon className="size-3.5" />
            Abrir Central
            <ExternalLinkIcon className="size-3 text-muted-foreground" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="divide-y rounded-lg border">
          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5 pr-4">
              <label
                htmlFor="toggle-schedules"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Escalas e escalas alteradas
              </label>
              <p className="text-xs text-muted-foreground">
                Seja notificado quando sua liderança te escalar para um culto ou modificar sua função.
              </p>
            </div>
            <Switch
              id="toggle-schedules"
              checked={scheduleAlerts}
              onCheckedChange={(val) =>
                handleToggle("escalas", val, setScheduleAlerts)
              }
            />
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5 pr-4">
              <label
                htmlFor="toggle-announcements"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Avisos da administração e liderança
              </label>
              <p className="text-xs text-muted-foreground">
                Comunicados gerais para toda a igreja ou específicos do seu departamento.
              </p>
            </div>
            <Switch
              id="toggle-announcements"
              checked={churchAnnouncements}
              onCheckedChange={(val) =>
                handleToggle("avisos da igreja", val, setChurchAnnouncements)
              }
            />
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="space-y-0.5 pr-4">
              <label
                htmlFor="toggle-birthdays"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Lembretes de aniversariantes
              </label>
              <p className="text-xs text-muted-foreground">
                Destaques quando irmãos da equipe estiverem comemorando aniversário hoje ou amanhã.
              </p>
            </div>
            <Switch
              id="toggle-birthdays"
              checked={birthdayReminders}
              onCheckedChange={(val) =>
                handleToggle("lembretes de aniversário", val, setBirthdayReminders)
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <SparklesIcon className="size-4 shrink-0 text-primary" />
          <span>
            As notificações in-app aparecem instantaneamente no sino superior e no aplicativo móvel.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
