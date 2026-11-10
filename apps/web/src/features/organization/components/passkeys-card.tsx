"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FingerprintIcon,
  KeyIcon,
  LaptopIcon,
  Loader2Icon,
  PlusIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  Trash2Icon,
} from "lucide-react";

import {
  deletePasskeyAction,
  getUserPasskeysAction,
  type PasskeyViewItem,
} from "@/app/actions/settings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { formatDate } from "@/lib/format";

type PasskeysCardProps = {
  initialPasskeys?: PasskeyViewItem[];
};

export function PasskeysCard({ initialPasskeys = [] }: PasskeysCardProps) {
  const [passkeys, setPasskeys] = useState<PasskeyViewItem[]>(initialPasskeys);
  const [registering, setRegistering] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refreshList() {
    try {
      const keys = await getUserPasskeysAction();
      setPasskeys(keys);
    } catch {
      // Ignora erro
    }
  }

  async function handleAddPasskey() {
    setRegistering(true);

    try {
      const res = await authClient.passkey.addPasskey({
        name: deviceName.trim() || undefined,
      });

      if (res?.error) {
        toast.error(
          res.error.message ||
            "Não foi possível registrar a chave de acesso.",
        );
        return;
      }

      toast.success("Chave de acesso adicionada com sucesso!");
      setDialogOpen(false);
      setDeviceName("");
      await refreshList();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao cadastrar chave de acesso.",
      );
    } finally {
      setRegistering(false);
    }
  }

  async function handleDeletePasskey(id: string) {
    setDeletingId(id);
    try {
      const res = await deletePasskeyAction(id);
      if (!res.success) {
        toast.error(res.error || "Não foi possível excluir a chave de acesso.");
        return;
      }
      toast.success("Chave de acesso removida.");
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Erro ao excluir chave de acesso.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-heading text-xl tracking-tight">
            Chaves de Acesso (Passkeys)
          </CardTitle>
          <CardDescription>
            Entre sem senha usando Face ID, Touch ID, Windows Hello ou uma chave de segurança física.
          </CardDescription>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 shrink-0">
              <PlusIcon className="size-4" />
              Adicionar Passkey
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar nova chave de acesso</DialogTitle>
              <DialogDescription>
                Você será solicitado pelo seu navegador ou sistema para autenticar via biometria ou chave de segurança.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label
                  htmlFor="device-name"
                  className="text-sm font-medium text-foreground"
                >
                  Nome do dispositivo (opcional)
                </label>
                <Input
                  id="device-name"
                  placeholder="ex: Meu MacBook Pro, iPhone de Trabalho"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={registering}
              >
                Cancelar
              </Button>
              <Button onClick={handleAddPasskey} disabled={registering} className="gap-2">
                {registering ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <FingerprintIcon className="size-4" />
                    Continuar registro
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {passkeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
              <FingerprintIcon className="size-6" />
            </div>
            <p className="font-heading text-base font-medium">
              Nenhuma chave de acesso cadastrada
            </p>
            <p className="max-w-sm text-xs text-muted-foreground mt-1 mb-4">
              Adicione uma passkey para entrar de forma rápida e segura sem precisar digitar sua senha.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="gap-1.5"
            >
              <PlusIcon className="size-3.5" />
              Configurar primeira passkey
            </Button>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {passkeys.map((p) => {
              const deviceIcon =
                p.deviceType?.toLowerCase().includes("phone") ||
                p.deviceType?.toLowerCase().includes("mobile") ? (
                  <SmartphoneIcon className="size-4 text-muted-foreground" />
                ) : p.deviceType?.toLowerCase().includes("desktop") ||
                  p.deviceType?.toLowerCase().includes("mac") ||
                  p.deviceType?.toLowerCase().includes("pc") ? (
                  <LaptopIcon className="size-4 text-muted-foreground" />
                ) : (
                  <KeyIcon className="size-4 text-muted-foreground" />
                );

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 sm:px-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                      {deviceIcon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {p.name || "Chave de acesso"}
                        </span>
                        {p.backedUp ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-normal"
                          >
                            <ShieldCheckIcon className="size-3 mr-1 text-emerald-500" />
                            Sincronizada
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.createdAt
                          ? `Criada em ${formatDate(new Date(p.createdAt))}`
                          : "Dispositivo registrado"}
                      </p>
                    </div>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={deletingId === p.id}
                        className="text-muted-foreground hover:text-destructive"
                        title="Remover chave"
                      >
                        {deletingId === p.id ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <Trash2Icon className="size-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover chave de acesso?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Você não poderá mais usar esta passkey ({p.name || "Chave"}) para entrar na sua conta. Você sempre poderá adicionar uma nova chave no futuro.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePasskey(p.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
