"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  BellIcon,
  Building2Icon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  SmartphoneIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  sendAnnouncementAction,
  type AnnouncementFormState,
} from "@/app/actions/notifications";
import { FormAlert } from "@/components/auth/form-alert";
import { SubmitButton } from "@/components/auth/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export type AnnouncementDepartment = {
  id: string;
  name: string;
};

export type AnnouncementPerson = {
  id: string;
  name: string;
  phone?: string | null;
  hasAccount?: boolean;
  departmentNames?: string[];
};

export function AnnouncementDialog({
  departments,
  people = [],
  canBroadcastAll = false,
  isWhatsAppConfigured = false,
  defaultDepartmentId,
  trigger,
}: {
  departments: AnnouncementDepartment[];
  people?: AnnouncementPerson[];
  canBroadcastAll?: boolean;
  isWhatsAppConfigured?: boolean;
  defaultDepartmentId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="lg" className="h-9">
            <MegaphoneIcon data-icon="inline-start" />
            Enviar aviso
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MegaphoneIcon className="size-5" />
            </span>
            <div>
              <DialogTitle className="font-heading text-2xl tracking-tight">
                Enviar aviso
              </DialogTitle>
              <DialogDescription className="text-xs">
                Notifique sua equipe ou a igreja pelos canais disponíveis.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <AnnouncementForm
          departments={departments}
          people={people}
          canBroadcastAll={canBroadcastAll}
          isWhatsAppConfigured={isWhatsAppConfigured}
          defaultDepartmentId={defaultDepartmentId}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function AnnouncementForm({
  departments,
  people,
  canBroadcastAll,
  isWhatsAppConfigured,
  defaultDepartmentId,
  onDone,
}: {
  departments: AnnouncementDepartment[];
  people: AnnouncementPerson[];
  canBroadcastAll: boolean;
  isWhatsAppConfigured: boolean;
  defaultDepartmentId?: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<
    AnnouncementFormState,
    FormData
  >(sendAnnouncementAction, undefined);
  const handled = useRef(false);

  const [audienceType, setAudienceType] = useState<
    "all" | "department" | "person"
  >(
    defaultDepartmentId
      ? "department"
      : canBroadcastAll
        ? "all"
        : departments.length > 0
          ? "department"
          : "person",
  );

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    defaultDepartmentId ?? departments[0]?.id ?? "",
  );
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    people[0]?.id ?? "",
  );

  const [sendInApp, setSendInApp] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(isWhatsAppConfigured);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success("Aviso enviado com sucesso!");
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="audienceType" value={audienceType} />
      {sendInApp && <input type="hidden" name="sendInApp" value="true" />}
      {sendWhatsApp && <input type="hidden" name="sendWhatsApp" value="true" />}

      {/* Seletor de Destinatário */}
      <FieldGroup className="space-y-3">
        <div>
          <FieldLabel className="text-sm font-medium">Quem recebe</FieldLabel>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {canBroadcastAll && (
              <button
                type="button"
                onClick={() => setAudienceType("all")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                  audienceType === "all"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Building2Icon className="size-4 shrink-0" />
                <span>Toda a igreja</span>
              </button>
            )}

            {departments.length > 0 && (
              <button
                type="button"
                onClick={() => setAudienceType("department")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                  audienceType === "department"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <UsersIcon className="size-4 shrink-0" />
                <span>Departamento</span>
              </button>
            )}

            {people.length > 0 && (
              <button
                type="button"
                onClick={() => setAudienceType("person")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                  audienceType === "person"
                    ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary"
                    : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <UserIcon className="size-4 shrink-0" />
                <span>Pessoa específica</span>
              </button>
            )}
          </div>
        </div>

        {/* Seleção contextual de Departamento */}
        {audienceType === "department" && (
          <Field data-invalid={Boolean(state?.fieldErrors?.departmentId)}>
            <FieldLabel htmlFor="announcement-department">
              Escolha o departamento
            </FieldLabel>
            <NativeSelect
              id="announcement-department"
              name="departmentId"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full [&_select]:h-10"
              aria-invalid={Boolean(state?.fieldErrors?.departmentId)}
              required
            >
              {departments.map((department) => (
                <NativeSelectOption key={department.id} value={department.id}>
                  {department.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError
              errors={state?.fieldErrors?.departmentId?.map((message) => ({
                message,
              }))}
            />
          </Field>
        )}

        {/* Seleção contextual de Pessoa */}
        {audienceType === "person" && (
          <Field data-invalid={Boolean(state?.fieldErrors?.personId)}>
            <FieldLabel htmlFor="announcement-person">
              Escolha a pessoa
            </FieldLabel>
            <NativeSelect
              id="announcement-person"
              name="personId"
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="w-full [&_select]:h-10"
              aria-invalid={Boolean(state?.fieldErrors?.personId)}
              required
            >
              {people.map((person) => {
                const depts = person.departmentNames?.length
                  ? ` (${person.departmentNames.join(", ")})`
                  : "";
                const phoneInfo = person.phone ? " • WhatsApp" : "";
                return (
                  <NativeSelectOption key={person.id} value={person.id}>
                    {person.name}
                    {depts}
                    {phoneInfo}
                  </NativeSelectOption>
                );
              })}
            </NativeSelect>
            <FieldError
              errors={state?.fieldErrors?.personId?.map((message) => ({
                message,
              }))}
            />
          </Field>
        )}
      </FieldGroup>

      {/* Canais de Envio */}
      <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Canais de notificação
          </FieldLabel>
          <span className="text-[11px] text-muted-foreground">
            Escolha por onde disparar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Canal 1: App */}
          <label
            htmlFor="channel-in-app"
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
              sendInApp
                ? "border-primary/50 bg-background shadow-xs"
                : "border-border/60 bg-card/60 opacity-70"
            }`}
          >
            <Checkbox
              id="channel-in-app"
              checked={sendInApp}
              onCheckedChange={(checked) => setSendInApp(Boolean(checked))}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-0.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <BellIcon className="size-3.5 text-primary" />
                <span>No aplicativo</span>
                <Badge variant="outline" className="ml-auto text-[10px] py-0 px-1">
                  Ativo
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Sino e central interna
              </p>
            </div>
          </label>

          {/* Canal 2: WhatsApp */}
          <label
            htmlFor="channel-whatsapp"
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
              sendWhatsApp
                ? "border-emerald-500/50 bg-background shadow-xs"
                : "border-border/60 bg-card/60 opacity-70"
            }`}
          >
            <Checkbox
              id="channel-whatsapp"
              checked={sendWhatsApp}
              onCheckedChange={(checked) => setSendWhatsApp(Boolean(checked))}
              className="mt-0.5 data-checked:border-emerald-600 data-checked:bg-emerald-600"
            />
            <div className="flex-1 space-y-0.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <MessageSquareIcon className="size-3.5 text-emerald-600" />
                <span>WhatsApp</span>
                <Badge
                  variant={isWhatsAppConfigured ? "secondary" : "outline"}
                  className={`ml-auto text-[10px] py-0 px-1 ${
                    isWhatsAppConfigured
                      ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {isWhatsAppConfigured ? "Conectado" : "Disponível"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {isWhatsAppConfigured
                  ? "Disparo direto via Evolution API"
                  : "Requer WhatsApp configurado"}
              </p>
            </div>
          </label>

          {/* Canal 3: E-mail (Futuramente) */}
          <div className="flex items-start gap-2.5 rounded-lg border border-border/40 bg-muted/20 p-2.5 opacity-60">
            <Checkbox id="channel-email" disabled className="mt-0.5" />
            <div className="flex-1 space-y-0.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <MailIcon className="size-3.5" />
                <span>E-mail</span>
                <Badge variant="outline" className="ml-auto text-[10px] py-0 px-1 border-dashed">
                  Em breve
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground/80 leading-snug">
                Envio transacional por email
              </p>
            </div>
          </div>

          {/* Canal 4: Push (Futuramente) */}
          <div className="flex items-start gap-2.5 rounded-lg border border-border/40 bg-muted/20 p-2.5 opacity-60">
            <Checkbox id="channel-push" disabled className="mt-0.5" />
            <div className="flex-1 space-y-0.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <SmartphoneIcon className="size-3.5" />
                <span>Push Mobile / Web</span>
                <Badge variant="outline" className="ml-auto text-[10px] py-0 px-1 border-dashed">
                  Em breve
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground/80 leading-snug">
                Notificação instantânea no celular
              </p>
            </div>
          </div>
        </div>

        {state?.fieldErrors?.channels ? (
          <p className="text-xs text-destructive">
            {state.fieldErrors.channels[0]}
          </p>
        ) : null}
      </div>

      {/* Título e Mensagem */}
      <FieldGroup className="space-y-3">
        <Field data-invalid={Boolean(state?.fieldErrors?.title)}>
          <FieldLabel htmlFor="announcement-title">Título do aviso</FieldLabel>
          <Input
            id="announcement-title"
            name="title"
            placeholder="Ex: Escala de Domingo ou Ensaio Geral"
            className="h-10"
            maxLength={80}
            aria-invalid={Boolean(state?.fieldErrors?.title)}
            required
          />
          <FieldError
            errors={state?.fieldErrors?.title?.map((message) => ({
              message,
            }))}
          />
        </Field>

        <Field data-invalid={Boolean(state?.fieldErrors?.body)}>
          <FieldLabel htmlFor="announcement-body">Mensagem</FieldLabel>
          <Textarea
            id="announcement-body"
            name="body"
            placeholder="Escreva as instruções ou orientações para a equipe..."
            rows={4}
            maxLength={500}
            aria-invalid={Boolean(state?.fieldErrors?.body)}
            required
          />
          <FieldError
            errors={state?.fieldErrors?.body?.map((message) => ({
              message,
            }))}
          />
        </Field>
      </FieldGroup>

      {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

      <DialogFooter className="gap-2 sm:gap-0">
        <DialogClose asChild>
          <Button type="button" variant="outline" className="h-10">
            Cancelar
          </Button>
        </DialogClose>
        <SubmitButton
          className="h-10"
          pendingLabel="Enviando..."
          size="default"
        >
          <MegaphoneIcon data-icon="inline-start" />
          Enviar aviso
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
