"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  Check,
  X,
} from "lucide-react"
import {
  getDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
} from "@/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

interface Template {
  id: string
  name: string
  entity: string
  content: string
  isDefault: boolean
  isActive: boolean
}

const ENTITIES = [
  { value: "proposal", label: "Proposta" },
  { value: "contract", label: "Contrato" },
  { value: "invoice", label: "Nota Fiscal" },
  { value: "order", label: "Pedido" },
]

const ENTITY_BADGE: Record<string, { label: string; className: string }> = {
  proposal: {
    label: "Proposta",
    className: "bg-emerald-500/10 text-emerald-400",
  },
  contract: {
    label: "Contrato",
    className: "bg-teal-500/10 text-teal-400",
  },
  invoice: {
    label: "Nota Fiscal",
    className: "bg-green-100 text-green-400",
  },
  order: {
    label: "Pedido",
    className: "bg-orange-500/10 text-orange-400",
  },
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isDefaultChecked, setIsDefaultChecked] = useState(false)
  const [isActiveChecked, setIsActiveChecked] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      const t = await getDocumentTemplates()
      setTemplates(t as Template[])
    })
  }, [])

  async function reload() {
    const t = await getDocumentTemplates()
    setTemplates(t as Template[])
  }

  function handleCreate() {
    setEditingTemplate(null)
    setIsDefaultChecked(false)
    setIsActiveChecked(true)
    setDialogOpen(true)
  }

  function handleEdit(template: Template) {
    setEditingTemplate(template)
    setIsDefaultChecked(template.isDefault)
    setIsActiveChecked(template.isActive)
    setDialogOpen(true)
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    const name = formData.get("name") as string
    const entity = formData.get("entity") as string
    const content = formData.get("content") as string
    const isDefault = isDefaultChecked
    const isActive = isActiveChecked

    startTransition(async () => {
      try {
        if (editingTemplate) {
          await updateDocumentTemplate(editingTemplate.id, {
            name,
            entity,
            content,
            isDefault,
            isActive,
          })
        } else {
          await createDocumentTemplate({
            name,
            entity,
            content,
            isDefault,
            isActive,
          })
        }
        setDialogOpen(false)
        await reload()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao salvar template",
        )
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteDocumentTemplate(id)
        await reload()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao excluir template",
        )
      }
    })
  }

  return (
    <div className="min-h-screen bg-foreground/[0.03]/60 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Administração
        </Link>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Modelos de Documento
            </h1>
            <p className="mt-1 text-sm text-foreground/50">
              Crie e gerencie modelos HTML para propostas, contratos e outros
              documentos.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Novo Modelo
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {templates.length === 0 ? (
          <div className="rounded-lg glass-card">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
                <FileText className="h-6 w-6 text-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground">
                Nenhum modelo cadastrado
              </h3>
              <p className="mt-1 text-sm text-foreground/50">
                Crie o primeiro modelo de documento.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const entityBadge = ENTITY_BADGE[template.entity] ?? {
                label: template.entity,
                className: "bg-foreground/[0.04] text-foreground/70",
              }

              return (
                <div
                  key={template.id}
                  className="rounded-lg glass-card p-5"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {template.name}
                        </h3>
                        <span
                          className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${entityBadge.className}`}
                        >
                          {entityBadge.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(template)}
                        aria-label="Editar modelo"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => handleDelete(template.id)}
                        disabled={isPending}
                        aria-label="Excluir modelo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {template.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                        <Star className="h-3 w-3" />
                        Padrão
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        template.isActive ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {template.isActive ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {template.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Create / Edit Template Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Editar Modelo" : "Novo Modelo"}
              </DialogTitle>
            </DialogHeader>

            <form action={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Modelo</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Proposta Comercial Padrão"
                    defaultValue={editingTemplate?.name ?? ""}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="entity">Entidade</Label>
                  <select
                    id="entity"
                    name="entity"
                    defaultValue={editingTemplate?.entity ?? "proposal"}
                    required
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {ENTITIES.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="content">Conteúdo HTML</Label>
                <textarea
                  id="content"
                  name="content"
                  rows={12}
                  placeholder="<h1>Proposta Comercial</h1>&#10;<p>Prezado(a) {{cliente_nome}},</p>&#10;..."
                  defaultValue={editingTemplate?.content ?? ""}
                  required
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isDefault"
                    checked={isDefaultChecked}
                    onCheckedChange={(v) => setIsDefaultChecked(v)}
                  />
                  <Label htmlFor="isDefault" className="text-sm">
                    Modelo padrão
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isActive"
                    checked={isActiveChecked}
                    onCheckedChange={(v) => setIsActiveChecked(v)}
                  />
                  <Label htmlFor="isActive" className="text-sm">
                    Ativo
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingTemplate ? "Salvar Alterações" : "Criar Modelo"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
