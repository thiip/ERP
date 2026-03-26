"use client";

import { useState, useTransition } from "react";
import { saveEmailConfig, toggleEmailActive, deleteEmailConfig } from "@/actions/email-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2, Power, PowerOff, Loader2 } from "lucide-react";

interface EmailConfigData {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromName: string;
  isActive: boolean;
}

export function EmailConfigForm({ config }: { config: EmailConfigData | null }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [isActive, setIsActive] = useState(config?.isActive ?? false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await saveEmailConfig(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  function handleToggle() {
    const newState = !isActive;
    setIsActive(newState);
    startTransition(async () => {
      await toggleEmailActive(newState);
    });
  }

  function handleDelete() {
    if (!confirm("Tem certeza que deseja remover a configuracao de email?")) return;
    startTransition(async () => {
      await deleteEmailConfig();
      window.location.reload();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Status */}
      {config && (
        <div className="flex items-center justify-between rounded-xl glass-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-green-500/100" : "bg-foreground/20"}`}
            />
            <span className="text-sm font-medium">
              {isActive ? "Email ativo" : "Email inativo"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggle}
              disabled={isPending}
            >
              {isActive ? (
                <>
                  <PowerOff className="h-4 w-4 mr-1" /> Desativar
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-1" /> Ativar
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="text-red-600 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* IMAP */}
      <div className="rounded-xl glass-card p-5 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Servidor de Entrada (IMAP)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="imapHost">Servidor IMAP</Label>
            <Input
              id="imapHost"
              name="imapHost"
              defaultValue={config?.imapHost ?? ""}
              placeholder="imap.gmail.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imapPort">Porta</Label>
            <Input
              id="imapPort"
              name="imapPort"
              type="number"
              defaultValue={config?.imapPort ?? 993}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imapUser">Usuario</Label>
            <Input
              id="imapUser"
              name="imapUser"
              defaultValue={config?.imapUser ?? ""}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imapPassword">Senha</Label>
            <Input
              id="imapPassword"
              name="imapPassword"
              type="password"
              defaultValue={config?.imapPassword ?? ""}
              placeholder="••••••••"
              required
            />
          </div>
        </div>
      </div>

      {/* SMTP */}
      <div className="rounded-xl glass-card p-5 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Servidor de Saída (SMTP)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtpHost">Servidor SMTP</Label>
            <Input
              id="smtpHost"
              name="smtpHost"
              defaultValue={config?.smtpHost ?? ""}
              placeholder="smtp.gmail.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPort">Porta</Label>
            <Input
              id="smtpPort"
              name="smtpPort"
              type="number"
              defaultValue={config?.smtpPort ?? 587}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpUser">Usuario</Label>
            <Input
              id="smtpUser"
              name="smtpUser"
              defaultValue={config?.smtpUser ?? ""}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPassword">Senha</Label>
            <Input
              id="smtpPassword"
              name="smtpPassword"
              type="password"
              defaultValue={config?.smtpPassword ?? ""}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="fromName">Nome do Remetente</Label>
            <Input
              id="fromName"
              name="fromName"
              defaultValue={config?.fromName ?? ""}
              placeholder="Seu Nome"
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Salvar Configuracao
            </>
          )}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Salvo com sucesso!</span>
        )}
      </div>
    </form>
  );
}
