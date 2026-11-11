import { ClipboardListIcon } from "lucide-react";

import { AssignmentList } from "@/components/app/assignment-list";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UpcomingAssignment } from "@/lib/agenda";

export function MemberSchedules({
  organizationName,
  upcoming,
  past,
}: {
  organizationName: string;
  upcoming: UpcomingAssignment[];
  past: UpcomingAssignment[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-4xl leading-none tracking-tight">
            Minhas escalas
          </h1>
          <Badge variant="outline" className="font-normal">
            {upcoming.length}
          </Badge>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Os encontros em que você foi escalado em{" "}
          <span className="font-medium text-foreground">
            {organizationName}
          </span>
          . As escalas passadas ficam no histórico.
        </p>
      </header>

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardListIcon className="size-6" />
          </span>
          <div className="max-w-sm space-y-1.5">
            <p className="font-heading text-xl tracking-tight">
              Nenhuma escala ainda
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Quando você for escalado em um encontro, ele aparece aqui com a
              função e o departamento.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-xl tracking-tight">
                Próximas
              </CardTitle>
              <CardDescription>
                Os encontros em que você vai atuar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma escala futura.
                </p>
              ) : (
                <AssignmentList assignments={upcoming} />
              )}
            </CardContent>
          </Card>

          {past.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-xl tracking-tight">
                  Já aconteceram
                </CardTitle>
                <CardDescription>
                  O histórico das suas escalas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssignmentList assignments={past} past />
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
