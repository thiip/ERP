"use client"

import { useState, useTransition } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  Power,
  Loader2,
  Webhook,
  ExternalLink,
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface WebhookData {
  id: string
  name: string
  url: string
  events: string
  secret: string | null
  isActive: boolean
  createdAt: string
  _count?: { logs: number }
}

interface AvailableEvent {
  event: string
  label: string
}

interface WebhookListProps {
  webhooks: WebhookData[]
  availableEvents: AvailableEvent[]
  createAction: (data: {
    name: string
    url: string
    events: string
    secret?: string
    isActive?: boolean
  }) => Promise<unknown>
  updateAction: (
    id: string,
    data: {
      name?: string
      url?: string
      events?: string
      secret?: string | null
      isActive?: boolean
    }
  ) => Promise<unknown>
  deleteAction: (id: string) => Promise<unknown>
  toggleAction: (id: string, isActive: boolean) => Promise<unknown>
}

export function WebhookList({
  webhooks,
  availableEvents,
  createAction,
  updateAction,
  deleteAction,
  toggleAction,
}: WebhookListProps) {
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookData | null>(
    null
  )
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [secret, setSecret] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])

  function openCreate() {
    setEditingWebhook(null)
    setName("")
    setUrl("")
    setSecret("")
    setSelectedEvents([])
    setFormOpen(true)
  }

  function openEdit(webhook: WebhookData) {
    setEditingWebhook(webhook)
    setName(webhook.name)
    setUrl(webhook.url)
    setSecret(webhook.secret ?? "")
    try {
      setSelectedEvents(JSON.parse(webhook.events))
    } catch {
      setSelectedEvents([])
    }
    setFormOpen(true)
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  function handleSave() {
    if (!name.trim() || !url.trim() || selectedEvents.length === 0) return

    startTransition(async () => {
      if (editingWebhook) {
        await updateAction(editingWebhook.id, {
          name: name.trim(),
          url: url.trim(),
          events: JSON.stringify(selectedEvents),
          secret: secret.trim() || null,
        })
      } else {
        await createAction({
          name: name.trim(),
          url: url.trim(),
          events: JSON.stringify(selectedEvents),
          secret: secret.trim() || undefined,
          isActive: true,
        })
      }
      setFormOpen(false)
    })
  }

  function handleToggle(webhook: WebhookData) {
    startTransition(async () => {
      await toggleAction(webhook.id, !webhook.isActive)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAction(id)
      setDeleteConfirm(null)
    })
  }

  function parseEvents(eventsJson: string): string[] {
    try {
      return JSON.parse(eventsJson)
    } catch {
      return []
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo Webhook
        </Button>
      </div>

      <div className="rounded-lg glass-card">
        {webhooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
              <Webhook className="h-6 w-6 text-foreground/40" />
            </div>
            <h3 className="text-sm font-medium text-foreground">
              Nenhum webhook configurado
            </h3>
            <p className="mt-1 text-sm text-foreground/50">
              Crie um webhook para receber notificações em tempo real.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Eventos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => {
                const events = parseEvents(webhook.events)
                return (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-600">
                          <Webhook className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-foreground">
                          {webhook.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-foreground/50">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="max-w-[200px] truncate">
                          {webhook.url}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {events.slice(0, 3).map((event) => (
                          <span
                            key={event}
                            className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400"
                          >
                            {event}
                          </span>
                        ))}
                        {events.length > 3 && (
                          <span className="inline-flex items-center rounded-full bg-foreground/[0.04] px-2 py-0.5 text-xs font-medium text-foreground/60">
                            +{events.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            webhook.isActive ? "bg-green-500/100" : "bg-red-500/100"
                          }`}
                        />
                        <span className="text-sm text-foreground/60">
                          {webhook.isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(webhook)}
                          disabled={isPending}
                          aria-label="Editar webhook"
                          className="text-foreground/50 hover:text-foreground/70"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleToggle(webhook)}
                          disabled={isPending}
                          aria-label={
                            webhook.isActive
                              ? "Desativar webhook"
                              : "Ativar webhook"
                          }
                          className={
                            webhook.isActive
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
                          onClick={() => setDeleteConfirm(webhook.id)}
                          disabled={isPending}
                          aria-label="Excluir webhook"
                          className="text-red-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingWebhook ? "Editar Webhook" : "Novo Webhook"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="webhook-name">Nome</Label>
              <Input
                id="webhook-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Notificação de vendas"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="webhook-url">URL</Label>
              <Input
                id="webhook-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo.com/webhook"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="webhook-secret">Secret (opcional)</Label>
              <Input
                id="webhook-secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Token secreto para validação"
              />
            </div>

            <div className="grid gap-2">
              <Label>Eventos</Label>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-foreground/[0.08] p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {availableEvents.map((ev) => (
                    <label
                      key={ev.event}
                      className="flex cursor-pointer items-center gap-2 text-sm text-foreground/70"
                    >
                      <Checkbox
                        checked={selectedEvents.includes(ev.event)}
                        onCheckedChange={() => toggleEvent(ev.event)}
                      />
                      {ev.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={
                isPending ||
                !name.trim() ||
                !url.trim() ||
                selectedEvents.length === 0
              }
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingWebhook ? "Salvar" : "Criar"}
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
            Tem certeza que deseja excluir este webhook? Você deixará de receber
            notificações neste endpoint.
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
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
