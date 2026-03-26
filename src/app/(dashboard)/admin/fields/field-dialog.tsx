"use client"

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"

const FIELD_TYPES = [
  { value: "TEXT", label: "Texto" },
  { value: "TEXTAREA", label: "Texto longo" },
  { value: "NUMBER", label: "Numero" },
  { value: "DECIMAL", label: "Decimal" },
  { value: "DATE", label: "Data" },
  { value: "DATETIME", label: "Data e Hora" },
  { value: "SELECT", label: "Selecao" },
  { value: "MULTISELECT", label: "Selecao multipla" },
  { value: "CHECKBOX", label: "Checkbox" },
  { value: "EMAIL", label: "E-mail" },
  { value: "PHONE", label: "Telefone" },
  { value: "URL", label: "URL" },
  { value: "CPF_CNPJ", label: "CPF/CNPJ" },
  { value: "CURRENCY", label: "Moeda" },
  { value: "FILE", label: "Arquivo" },
  { value: "USER_REFERENCE", label: "Referencia de usuario" },
] as const

export interface FieldFormData {
  id?: string
  name: string
  label: string
  fieldType: string
  section: string
  isRequired: boolean
  defaultValue: string
  placeholder: string
  helpText: string
  options: string
}

interface Section {
  id: string
  name: string
  label: string
}

interface FieldDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: FieldFormData) => Promise<void>
  sections: Section[]
  initialData?: FieldFormData | null
}

const emptyForm: FieldFormData = {
  name: "",
  label: "",
  fieldType: "TEXT",
  section: "default",
  isRequired: false,
  defaultValue: "",
  placeholder: "",
  helpText: "",
  options: "",
}

export function FieldDialog({
  isOpen,
  onClose,
  onSubmit,
  sections,
  initialData,
}: FieldDialogProps) {
  const [form, setForm] = useState<FieldFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const isEditing = !!initialData?.id

  useEffect(() => {
    if (isOpen) {
      setForm(initialData ?? emptyForm)
    }
  }, [isOpen, initialData])

  const showOptions =
    form.fieldType === "SELECT" || form.fieldType === "MULTISELECT"

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative w-full max-w-lg rounded-xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-foreground/[0.08] px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">
            {isEditing ? "Editar Campo" : "Novo Campo"}
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
            {/* Label */}
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
                placeholder="Ex: Telefone Comercial"
              />
            </div>

            {/* Name (auto-generated) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">
                Nome do campo (slug)
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={isEditing}
                className="w-full rounded-lg border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-sm text-foreground/50 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:cursor-not-allowed"
                placeholder="telefone_comercial"
              />
            </div>

            {/* Type + Section row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/70">
                  Tipo <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.fieldType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      fieldType: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>
                      {ft.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/70">
                  Secao
                </label>
                <select
                  value={form.section}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, section: e.target.value }))
                  }
                  className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="default">Padrao</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Required toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.isRequired}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    isRequired: !prev.isRequired,
                  }))
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  form.isRequired ? "bg-teal-600" : "bg-foreground/10"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-card shadow transition ${
                    form.isRequired ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-foreground/70">Campo obrigatorio</span>
            </div>

            {/* Placeholder */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">
                Placeholder
              </label>
              <input
                type="text"
                value={form.placeholder}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    placeholder: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Default Value */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">
                Valor padrao
              </label>
              <input
                type="text"
                value={form.defaultValue}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    defaultValue: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Help Text */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">
                Texto de ajuda
              </label>
              <input
                type="text"
                value={form.helpText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, helpText: e.target.value }))
                }
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Instrucao que aparece abaixo do campo"
              />
            </div>

            {/* Options (for SELECT / MULTISELECT) */}
            {showOptions && (
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground/70">
                  Opcoes (uma por linha)
                </label>
                <textarea
                  rows={4}
                  value={form.options}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, options: e.target.value }))
                  }
                  className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder={"Opcao 1\nOpcao 2\nOpcao 3"}
                />
                <p className="mt-1 text-xs text-foreground/40">
                  Cada linha sera uma opcao no dropdown.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
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
              {isEditing ? "Salvar" : "Criar Campo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
