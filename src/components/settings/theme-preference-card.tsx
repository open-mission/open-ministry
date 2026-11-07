"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { CheckIcon, LaptopIcon, MoonIcon, SunIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ThemePreferenceCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Avoid hydration mismatch
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl tracking-tight">
            Aparência
          </CardTitle>
          <CardDescription>
            Personalize o tema visual do sistema para seu dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-28 rounded-lg bg-muted/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const options = [
    {
      id: "light",
      label: "Claro",
      description: "Interface com tons claros e legibilidade para o dia.",
      icon: SunIcon,
    },
    {
      id: "dark",
      label: "Escuro",
      description: "Tons escuros e descanso visual para ambientes com pouca luz.",
      icon: MoonIcon,
    },
    {
      id: "system",
      label: "Sistema",
      description: "Acompanha automaticamente a configuração do seu aparelho.",
      icon: LaptopIcon,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl tracking-tight">
          Aparência
        </CardTitle>
        <CardDescription>
          Personalize o tema visual do sistema para seu dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((opt) => {
            const isSelected = theme === opt.id;
            const Icon = opt.icon;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={cn(
                  "relative flex flex-col items-start rounded-xl border p-4 text-left transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected
                    ? "border-primary bg-primary/[0.03] ring-1 ring-primary shadow-xs"
                    : "border-border bg-card hover:bg-muted/30",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg border",
                      isSelected
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border bg-muted/50 text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  {isSelected ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon className="size-3 stroke-[3]" />
                    </span>
                  ) : null}
                </div>

                <div className="mt-3">
                  <p className="font-medium text-sm text-foreground">
                    {opt.label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
