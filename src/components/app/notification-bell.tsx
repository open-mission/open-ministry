"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotificationBell({
  initialCount,
}: {
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/notifications/unread-count", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { count?: number };

        if (active && typeof data.count === "number") {
          setCount(data.count);
        }
      } catch {
        // A contagem volta na próxima navegação ou no próximo intervalo.
      }
    }

    const interval = window.setInterval(load, 45_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <Button asChild variant="ghost" size="icon-sm">
      <Link
        href="/dashboard/notifications"
        className="relative"
        aria-label={
          count > 0
            ? `${count} notificações não lidas`
            : "Notificações"
        }
        title="Notificações"
      >
        <BellIcon />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-medium leading-none text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
