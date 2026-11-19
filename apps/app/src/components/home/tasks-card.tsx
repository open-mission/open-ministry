import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { TaskItem } from "@/features/tasks/services/tasks-service";
import { formatTaskDeadline } from "@/features/tasks/lib/task-utils";

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
            Minhas tarefas
          </HomeSectionTitle>
          <HomeSectionDescription className="text-xs">
            O que precisa ser feito nos próximos dias.
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

            return (
              <div key={task.id}>
                {index > 0 ? <Separator className="my-1" /> : null}
                <div className="flex items-start gap-3 py-2">
                  <TaskCheckbox
                    taskId={task.id}
                    initialStatus={task.status}
                    label={task.title}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {task.title}
                    </p>
                    {deadline ? (
                      <p
                        className={`text-xs ${
                          deadline.isOverdue
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {deadline.isOverdue ? "Atrasada · " : ""}
                        {deadline.label}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </HomeCardContent>
      </HomeCard>
    </HomeSection>
  );
}
