"use client"

import { useState, useTransition } from "react"
import {
  MessageCircle,
  Mail,
  Calendar,
  Building2,
  BarChart3,
  FileText,
  CreditCard,
  HardDrive,
  Webhook,
  Plug,
  Power,
  Trash2,
  Settings2,
  Loader2,
  Plus,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PROVIDER_META: Record<
  string,
  { icon: LucideIcon; color: string; bgColor: string }
> = {
  whatsapp: { icon: MessageCircle, color: "text-green-600", bgColor: "bg-green-500/10" },
  email_smtp: { icon: Mail, color: "text-emerald-600", bgColor: "bg-emerald-500/10" },
  google: { icon: Calendar, color: "text-red-600", bgColor: "bg-red-500/10" },
  erp_omie: { icon: Building2, color: "text-green-600", bgColor: "bg-green-500/10" },
  erp_bling: { icon: Building2, color: "text-orange-600", bgColor: "bg-orange-500/10" },
  nfe: { icon: FileText, color: "text-teal-600", bgColor: "bg-teal-50" },
  payment_pix: { icon: CreditCard, color: "text-emerald-600", bgColor: "bg-emerald-50" },
  storage_s3: { icon: HardDrive, color: "text-yellow-600", bgColor: "bg-yellow-500/10" },
  analytics_ga: { icon: BarChart3, color: "text-yellow-600", bgColor: "bg-yellow-500/10" },
  conta_azul: { icon: Building2, color: "text-sky-600", bgColor: "bg-sky-50" },
  activecampaign: { icon: Mail, color: "text-teal-600", bgColor: "bg-teal-500/10" },
  docusign: { icon: FileText, color: "text-violet-600", bgColor: "bg-violet-50" },
  webhook_generic: { icon: Webhook, color: "text-foreground/60", bgColor: "bg-foreground/[0.04]" },
}

const PROVIDER_FIELDS: Record<string, { key: string; label: string; type?: string }[]> = {
  whatsapp: [
    { key: "phone_number_id", label: "Phone Number ID" },
    { key: "access_token", label: "Access Token", type: "password" },
    { key: "webhook_verify_token", label: "Webhook Verify Token" },
  ],
  email_smtp: [
    { key: "host", label: "Host SMTP" },
    { key: "port", label: "Porta" },
    { key: "username", label: "Usuário" },
    { key: "password", label: "Senha", type: "password" },
    { key: "from_email", label: "Email de envio" },
  ],
  google: [
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret", type: "password" },
    { key: "redirect_uri", label: "Redirect URI" },
  ],
  erp_omie: [
    { key: "app_key", label: "App Key" },
    { key: "app_secret", label: "App Secret", type: "password" },
  ],
  erp_bling: [
    { key: "api_key", label: "API Key", type: "password" },
  ],
  nfe: [
    { key: "cnpj", label: "CNPJ" },
    { key: "certificate", label: "Certificado Digital (base64)" },
    { key: "certificate_password", label: "Senha do Certificado", type: "password" },
  ],
  payment_pix: [
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret", type: "password" },
    { key: "pix_key", label: "Chave PIX" },
  ],
  storage_s3: [
    { key: "access_key", label: "Access Key" },
    { key: "secret_key", label: "Secret Key", type: "password" },
    { key: "bucket", label: "Bucket" },
    { key: "region", label: "Região" },
  ],
  analytics_ga: [
    { key: "tracking_id", label: "Tracking ID" },
    { key: "api_key", label: "API Key", type: "password" },
  ],
  conta_azul: [
    { key: "client_id", label: "Client ID" },
    { key: "client_secret", label: "Client Secret", type: "password" },
  ],
  activecampaign: [
    { key: "api_url", label: "API URL" },
    { key: "api_key", label: "API Key", type: "password" },
  ],
  docusign: [
    { key: "integration_key", label: "Integration Key" },
    { key: "secret_key", label: "Secret Key", type: "password" },
    { key: "account_id", label: "Account ID" },
  ],
  webhook_generic: [
    { key: "url", label: "URL do Webhook" },
    { key: "secret", label: "Secret", type: "password" },
  ],
}

interface AvailableProvider {
  provider: string
  name: string
  category: string
  description: string
}

interface Integration {
  id: string
  provider: string
  name: string
  config: string
  isActive: boolean
  createdAt: string
  _count?: { logs: number }
}

interface IntegrationCardsProps {
  integrations: Integration[]
  availableProviders: AvailableProvider[]
  createAction: (data: {
    provider: string
    name: string
    config: string
    isActive?: boolean
  }) => Promise<unknown>
  toggleAction: (id: string, isActive: boolean) => Promise<unknown>
  deleteAction: (id: string) => Promise<unknown>
}

export function IntegrationCards({
  integrations,
  availableProviders,
  createAction,
  toggleAction,
  deleteAction,
}: IntegrationCardsProps) {
  const [isPending, startTransition] = useTransition()
  const [configOpen, setConfigOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const connectedProviders = new Map(
    integrations.map((i) => [i.provider, i])
  )

  function handleConfigure(provider: string) {
    const existing = connectedProviders.get(provider)
    if (existing) {
      try {
        const parsed = JSON.parse(existing.config)
        setConfigValues(parsed)
      } catch {
        setConfigValues({})
      }
    } else {
      setConfigValues({})
    }
    setSelectedProvider(provider)
    setConfigOpen(true)
  }

  function handleSave() {
    if (!selectedProvider) return
    const providerInfo = availableProviders.find(
      (p) => p.provider === selectedProvider
    )
    if (!providerInfo) return

    startTransition(async () => {
      await createAction({
        provider: selectedProvider,
        name: providerInfo.name,
        config: JSON.stringify(configValues),
        isActive: true,
      })
      setConfigOpen(false)
      setSelectedProvider(null)
      setConfigValues({})
    })
  }

  function handleToggle(integration: Integration) {
    startTransition(async () => {
      await toggleAction(integration.id, !integration.isActive)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAction(id)
      setDeleteConfirm(null)
    })
  }

  const fields = selectedProvider
    ? PROVIDER_FIELDS[selectedProvider] ?? [
        { key: "api_key", label: "API Key", type: "password" },
      ]
    : []

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableProviders.map((ap) => {
          const meta = PROVIDER_META[ap.provider] ?? {
            icon: Plug,
            color: "text-foreground/60",
            bgColor: "bg-foreground/[0.04]",
          }
          const Icon = meta.icon
          const connected = connectedProviders.get(ap.provider)

          return (
            <div
              key={ap.provider}
              className="relative flex flex-col rounded-lg glass-card p-5 transition-all hover:shadow-lg"
            >
              <div className="mb-3 flex items-start justify-between">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.bgColor} ${meta.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {connected && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      connected.isActive
                        ? "bg-green-100 text-green-400"
                        : "bg-foreground/[0.04] text-foreground/60"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        connected.isActive ? "bg-green-500/100" : "bg-foreground/40"
                      }`}
                    />
                    {connected.isActive ? "Conectado" : "Desconectado"}
                  </span>
                )}
              </div>

              <h3 className="mb-1 text-sm font-semibold text-foreground">
                {ap.name}
              </h3>
              <p className="mb-4 flex-1 text-xs text-foreground/50">
                {ap.description}
              </p>

              <div className="flex items-center gap-2">
                {connected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfigure(ap.provider)}
                      disabled={isPending}
                    >
                      <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                      Configurar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleToggle(connected)}
                      disabled={isPending}
                      className={
                        connected.isActive
                          ? "text-red-500 hover:bg-red-500/10 hover:text-red-400"
                          : "text-green-500 hover:bg-green-500/10 hover:text-green-400"
                      }
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteConfirm(connected.id)}
                      disabled={isPending}
                      className="text-red-500 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfigure(ap.provider)}
                    disabled={isPending}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Conectar
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Configure Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Configurar{" "}
              {availableProviders.find((p) => p.provider === selectedProvider)
                ?.name ?? "Integração"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {fields.map((field) => (
              <div key={field.key} className="grid gap-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type ?? "text"}
                  value={configValues[field.key] ?? ""}
                  onChange={(e) =>
                    setConfigValues((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  placeholder={field.label}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/50">
            Tem certeza que deseja remover esta integração? Esta ação não pode
            ser desfeita.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
