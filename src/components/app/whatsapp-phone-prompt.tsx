"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  Loader2Icon,
  MessageCircleIcon,
  SmartphoneIcon,
} from "lucide-react";

import { updateUserWhatsAppAction } from "@/app/actions/whatsapp-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  clearWhatsAppPromptDismissal,
  dismissWhatsAppPrompt,
  formatBrazilianPhone,
  isValidBrazilianPhone,
  isWhatsAppPromptDismissed,
} from "@/lib/whatsapp-prompt";

export function WhatsAppPhonePrompt({
  userName,
}: {
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user dismissed the prompt recently
    if (isWhatsAppPromptDismissed()) {
      return;
    }

    // Delay slightly to prevent jarring popup on initial page render
    const timer = setTimeout(() => {
      setOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      // User closed via ESC or backdrop click -> snooze for 3 days
      dismissWhatsAppPrompt(3);
    }
    setOpen(nextOpen);
  }

  function handleDismiss() {
    dismissWhatsAppPrompt(3);
    setOpen(false);
    toast.info("Lembrete adiado por 3 dias. Você pode configurar a qualquer momento no seu perfil.");
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatBrazilianPhone(e.target.value);
    setPhone(formatted);
    if (validationError) {
      setValidationError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!phone.trim()) {
      setValidationError("Informe o seu número de WhatsApp.");
      return;
    }

    if (!isValidBrazilianPhone(phone)) {
      setValidationError("Número inválido. Use o formato com DDD, ex: (11) 99999-8888.");
      return;
    }

    if (!optIn) {
      setValidationError("Marque a caixa confirmando o aceite para receber as notificações.");
      return;
    }

    setValidationError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("phone", phone);
      formData.set("optIn", "true");

      const res = await updateUserWhatsAppAction(formData);

      if (res.ok) {
        clearWhatsAppPromptDismissal();
        toast.success("WhatsApp cadastrado com sucesso! Agora você receberá os avisos da igreja por lá.");
        setOpen(false);
      } else {
        setValidationError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <MessageCircleIcon className="size-6" />
              </div>
              <Badge
                variant="secondary"
                className="gap-1 bg-emerald-50 text-[0.7rem] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                <SmartphoneIcon className="size-3" />
                WhatsApp
              </Badge>
            </div>

            <DialogTitle className="font-heading text-xl tracking-tight text-foreground sm:text-2xl">
              Fique por dentro das escalas no seu WhatsApp
            </DialogTitle>

            <DialogDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Olá, <strong className="text-foreground">{userName}</strong>! Para não
              perder suas escalas de culto, avisos da liderança e comunicações
              importantes, mantenha seu número de WhatsApp cadastrado.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="space-y-4">
            <Field data-invalid={Boolean(validationError)}>
              <FieldLabel htmlFor="whatsapp-prompt-phone" className="text-xs font-medium">
                WhatsApp com DDD
              </FieldLabel>
              <Input
                id="whatsapp-prompt-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="(11) 99999-8888"
                value={phone}
                onChange={handlePhoneChange}
                disabled={isPending}
                className="h-11 rounded-xl text-sm"
                aria-invalid={Boolean(validationError)}
                autoFocus
              />
              {validationError ? (
                <FieldError errors={[{ message: validationError }]} />
              ) : null}
            </Field>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5">
              <label
                htmlFor="whatsapp-prompt-optin"
                className="flex items-start gap-3 cursor-pointer select-none"
              >
                <Checkbox
                  id="whatsapp-prompt-optin"
                  checked={optIn}
                  onCheckedChange={(val) => setOptIn(Boolean(val))}
                  disabled={isPending}
                  className="mt-0.5"
                />
                <div className="space-y-1 text-xs">
                  <span className="font-medium text-foreground leading-snug block">
                    Concordo em receber avisos e notificações da igreja pelo WhatsApp
                  </span>
                  <span className="text-[0.7rem] text-muted-foreground leading-normal block">
                    Enviaremos alertas quando você for escalado ou quando sua liderança publicar comunicados.
                  </span>
                </div>
              </label>
            </div>
          </FieldGroup>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDismiss}
              disabled={isPending}
              className="h-10 text-xs text-muted-foreground hover:text-foreground"
            >
              Lembrar mais tarde
            </Button>
            <Button
              type="submit"
              disabled={isPending || !phone.trim() || !optIn}
              className="h-10 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-medium px-5"
            >
              {isPending ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckIcon className="size-3.5 mr-1.5" />
                  Salvar WhatsApp
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
