"use client";

import { useState } from "react";
import { CakeIcon, PencilIcon } from "lucide-react";

import { BirthdayForm } from "./birthday-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatOwnBirthday } from "@/lib/birthdays";

type OwnBirthdayCardProps = {
  birthday: string | null;
  maxDate: string;
};

export function OwnBirthdayCard({ birthday, maxDate }: OwnBirthdayCardProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const formattedDate = formatOwnBirthday(birthday, true);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-heading text-xl tracking-tight">
              Sua data
            </CardTitle>
            <CakeIcon className="size-5 text-primary" />
          </div>
          <CardDescription>
            Mantenha a sua data em dia para a equipe celebrar com você.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3.5">
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">
                Seu aniversário
              </p>
              <p className="truncate text-base font-semibold text-foreground">
                {formattedDate ?? "Não informado"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
              className="h-8 shrink-0 gap-1.5 rounded-lg px-3 text-xs font-medium"
            >
              <PencilIcon className="size-3.5" />
              Mudar data
            </Button>
          </div>
        </CardContent>
        <CardFooter className="text-xs leading-relaxed text-muted-foreground pt-0">
          A equipe vê o dia e o mês para celebrar junto. O ano fica visível apenas para administradores.
        </CardFooter>
      </Card>

      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="p-0">
            <DrawerHeader className="border-b px-5 pt-4 pb-3 !text-left text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <DrawerTitle className="font-heading text-xl tracking-tight">
                Alterar data de nascimento
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground text-left">
                Informe o dia, mês e ano em que você nasceu.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-5 py-4 pb-8">
              <BirthdayForm
                birthday={birthday}
                maxDate={maxDate}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl tracking-tight">
                Alterar data de nascimento
              </DialogTitle>
              <DialogDescription>
                Informe o dia, mês e ano em que você nasceu.
              </DialogDescription>
            </DialogHeader>
            <BirthdayForm
              birthday={birthday}
              maxDate={maxDate}
              onSuccess={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
