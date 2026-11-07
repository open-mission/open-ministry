"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRoundIcon, Loader2Icon, ShieldAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    setLoading(true);

    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });

      if (res?.error) {
        setError(res.error.message || "Não foi possível alterar a senha. Verifique a senha atual.");
        toast.error("Erro ao alterar senha.");
        setLoading(false);
        return;
      }

      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao alterar senha.");
      toast.error("Erro inesperado ao alterar senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl tracking-tight">
          Segurança e Senha
        </CardTitle>
        <CardDescription>
          Mantenha sua conta protegida atualizando sua senha regularmente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <ShieldAlertIcon className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="current-password">Senha atual</FieldLabel>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                placeholder="Informe sua senha atual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-10 max-w-md"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="new-password">Nova senha</FieldLabel>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Pelo menos 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-10"
              />
              <FieldDescription>Mínimo de 8 caracteres.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirm-password">Confirmar nova senha</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-10"
              />
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="revoke-sessions"
              checked={revokeOtherSessions}
              onCheckedChange={(checked) => setRevokeOtherSessions(Boolean(checked))}
            />
            <label
              htmlFor="revoke-sessions"
              className="text-xs text-muted-foreground select-none cursor-pointer"
            >
              Desconectar outros dispositivos após alterar a senha
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Atualizando senha...
                </>
              ) : (
                <>
                  <KeyRoundIcon className="size-4" />
                  Salvar nova senha
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
