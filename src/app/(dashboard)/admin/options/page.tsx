"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
} from "lucide-react"
import {
  getPreRegisteredOptions,
  createPreRegisteredOption,
  updatePreRegisteredOption,
  deletePreRegisteredOption,
  getOptionCategories,
} from "@/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

interface OptionCategory {
  value: string
  label: string
}

interface PreRegisteredOption {
  id: string
  category: string
  value: string
  label: string
  color: string | null
  order: number
  isActive: boolean
}

const COLOR_PRESETS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#64748b",
]

export default function OptionsPage() {
  const [categories, setCategories] = useState<OptionCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [options, setOptions] = useState<PreRegisteredOption[]>([])
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<PreRegisteredOption | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      const cats = await getOptionCategories()
      setCategories(cats)
      if (cats.length > 0) {
        setSelectedCategory(cats[0].value)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedCategory) return
    startTransition(async () => {
      const opts = await getPreRegisteredOptions(selectedCategory)
      setOptions(opts as PreRegisteredOption[])
    })
  }, [selectedCategory])

  async function reload() {
    const opts = await getPreRegisteredOptions(selectedCategory)
    setOptions(opts as PreRegisteredOption[])
  }

  function handleCreate() {
    setEditingOption(null)
    setDialogOpen(true)
  }

  function handleEdit(option: PreRegisteredOption) {
    setEditingOption(option)
    setDialogOpen(true)
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    const label = formData.get("label") as string
    const value = formData.get("value") as string
    const color = formData.get("color") as string
    const order = parseInt(formData.get("order") as string) || 0

    startTransition(async () => {
      try {
        if (editingOption) {
          await updatePreRegisteredOption(editingOption.id, {
            label,
            color: color || null,
            order,
          })
        } else {
          await createPreRegisteredOption({
            category: selectedCategory,
            value,
            label,
            color: color || undefined,
            order,
          })
        }
        setDialogOpen(false)
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar opção")
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deletePreRegisteredOption(id)
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir opção")
      }
    })
  }

  function handleToggleActive(option: PreRegisteredOption) {
    startTransition(async () => {
      await updatePreRegisteredOption(option.id, {
        isActive: !option.isActive,
      })
      await reload()
    })
  }

  const selectedCategoryLabel =
    categories.find((c) => c.value === selectedCategory)?.label ?? ""

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

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Opções Pré-cadastradas
          </h1>
          <p className="mt-1 text-sm text-foreground/50">
            Gerencie as opções de seleção disponíveis em formulários do sistema.
          </p>
        </div>

        <div className="flex gap-6">
          {/* Left sidebar - categories */}
          <div className="w-56 shrink-0">
            <nav className="flex flex-col gap-1">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    selectedCategory === cat.value
                      ? "bg-teal-500/10 text-teal-400"
                      : "text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right content - options list */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {selectedCategoryLabel}
              </h2>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Nova Opção
              </Button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="rounded-lg glass-card">
              {options.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
                    <ListChecks className="h-6 w-6 text-foreground/40" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground">
                    Nenhuma opção cadastrada
                  </h3>
                  <p className="mt-1 text-sm text-foreground/50">
                    Crie a primeira opção para esta categoria.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-foreground/[0.04]">
                  {options.map((option) => (
                    <li
                      key={option.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-foreground/30" />

                      {option.color && (
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                      )}

                      <span className="flex-1 text-sm font-medium text-foreground">
                        {option.label}
                      </span>

                      <span className="text-xs text-foreground/40">
                        Ordem: {option.order}
                      </span>

                      {/* Active/Inactive toggle */}
                      <button
                        onClick={() => handleToggleActive(option)}
                        disabled={isPending}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                          option.isActive ? "bg-green-500/100" : "bg-foreground/20"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full glass-card transition-transform ${
                            option.isActive
                              ? "translate-x-4"
                              : "translate-x-0.5"
                          }`}
                        />
                      </button>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(option)}
                        aria-label="Editar opção"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => handleDelete(option.id)}
                        disabled={isPending}
                        aria-label="Excluir opção"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingOption ? "Editar Opção" : "Nova Opção"}
              </DialogTitle>
            </DialogHeader>

            <form action={handleSubmit} className="grid gap-4">
              {!editingOption && (
                <div className="grid gap-2">
                  <Label htmlFor="value">Valor (chave interna)</Label>
                  <Input
                    id="value"
                    name="value"
                    placeholder="ex: segmento_corporativo"
                    required
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="label">Rótulo</Label>
                <Input
                  id="label"
                  name="label"
                  placeholder="Nome exibido"
                  defaultValue={editingOption?.label ?? ""}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="color">Cor</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    name="color"
                    type="text"
                    placeholder="#6366f1"
                    defaultValue={editingOption?.color ?? ""}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const input = document.getElementById(
                          "color",
                        ) as HTMLInputElement
                        if (input) input.value = c
                      }}
                      className="h-5 w-5 rounded-full border border-foreground/[0.08] transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="order">Ordem</Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  defaultValue={editingOption?.order ?? 0}
                />
              </div>

              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingOption ? "Salvar Alterações" : "Criar Opção"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
