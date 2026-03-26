"use client"

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"

export interface SectionFormData {
  id?: string
  name: string
  label: string
  isCollapsible: boolean
}

interface SectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: SectionFormData) => Promise<void>
  initialData?: SectionFormData | null
}

const emptyForm: SectionFormData = {
  name: "",
  label: "",
  isCollapsible: true,
}

export function SectionDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: SectionDialogProps) {
  const [form, setForm] = useState<SectionFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const isEditing = !!initialData?.id

  useEffect(() => {
    if (isOpen) {
      setForm(initialData ?? emptyForm)
    }
  }, [isOpen, initialData])

  function handleLabelChange(label: string) {
    setForm((prev) => ({
      ...prev,
      label,
      name: isEditing
        ? prev.name
        : label
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, ""),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative w-full max-w-md rounded-xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-foreground/[0.08] px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">
            {isEditing ? "Editar Secao" : "Nova Secao"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-foreground/40 hover:bg-foreground/[0.04] hover:text-foreground/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Ex: Informacoes Financeiras"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">
                Nome (slug)
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={isEditing}
                className="w-full rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-sm text-foreground/50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.isCollapsible}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    isCollapsible: !prev.isCollapsible,
                  }))
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  form.isCollapsible ? "bg-teal-600" : "bg-foreground/10"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-card shadow transition ${
                    form.isCollapsible ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-foreground/70">Recolhivel</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-foreground/[0.04] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.03]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.label || !form.name}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar" : "Criar Secao"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
