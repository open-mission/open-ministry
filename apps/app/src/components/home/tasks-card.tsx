import Link from "next/link";
import { isToday, isTomorrow } from "date-fns";
import { ArrowRightIcon } from "lucide-react";

import { HomeCard, HomeCardContent } from "@/components/home/home-card";
import { TaskCheckbox } from "@/components/home/task-checkbox";
import {
  HomeSection,
  HomeSectionAction,
  HomeSectionDescription,
  HomeSectionHeader,
  HomeSectionTitle,
} from "@/components/home/home-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatTaskDeadline } from "@/features/tasks/lib/task-utils";
import type { TaskItem } from "@/features/tasks/services/tasks-service";

/** Cores semânticas para o prazo, aplicadas ao checkbox e ao badge. */
function deadlineTone(
  deadline: Date | string | null | undefined,
  isOverdue: boolean,
): { checkbox: string; badge: string } {
  if (isOverdue) {
    return {
      checkbox: "border-destructive",
      badge: "border-0 bg-destructive/15 text-destructive",
    };
  }

  if (deadline) {
    const date = new Date(deadline);
    if (isToday(date)) {
      return {
        checkbox: "border-accent-foreground",
        badge: "border-0 bg-accent text-accent-foreground",
      };
    }
    if (isTomorrow(date)) {
      return {
        checkbox: "border-primary",
        badge: "border-0 bg-primary/15 text-primary",
      };
    }
  }

  return {
    checkbox: "border-muted-foreground/50",
    badge: "border-0 bg-muted text-muted-foreground",
  };
}

export function TasksCard({ tasks }: { tasks: TaskItem[] }) {
  const activeTasks = tasks
    .filter((task) => task.status === "todo" || task.status === "in_progress")
    .slice(0, 3);

  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <HomeSection aria-labelledby="home-tasks-title">
      <HomeSectionHeader>
        <div className="space-y-0.5">
          <HomeSectionTitle id="home-tasks-title">
            Minhas Tarefas
          </HomeSectionTitle>
          <HomeSectionDescription className="text-xs">
            Afazeres pessoais e demandas atribuídas a você.
          </HomeSectionDescription>
        </div>
        <HomeSectionAction>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 min-h-[44px] px-2 text-xs text-primary hover:text-primary"
          >
            <Link href="/dashboard/tasks">
              Ver todas
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </HomeSectionAction>
      </HomeSectionHeader>

      <HomeCard>
        <HomeCardContent className="space-y-0">
          {activeTasks.map((task, index) => {
            const deadline = formatTaskDeadline(
              task.deadline,
              task.status === "completed",
            );
            const tone = deadlineTone(
              task.deadline,
              Boolean(deadline?.isOverdue),
            );

            return (
              <div key={task.id}>
                {index > 0 ? <Separator className="my-1" /> : null}
                <div className="flex min-h-[44px] items-center gap-3 py-1.5">
                  <TaskCheckbox
                    taskId={task.id}
                    initialStatus={task.status}
                    label={task.title}
                    className={tone.checkbox}
                  />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {task.title}
                  </p>
                  {deadline ? (
                    <Badge
                      className={`shrink-0 px-2 py-0.5 text-[11px] font-medium tabular-nums ${tone.badge}`}
                    >
                      {deadline.isOverdue
                        ? `Atrasada · ${deadline.label}`
                        : deadline.label}
                    </Badge>
                  ) : null}
                </div>
              </div>
            );
          })}
        </HomeCardContent>
      </HomeCard>
    </HomeSection>
  );
}
