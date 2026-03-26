"use client"

import { useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Asterisk,
  Loader2,
  LayoutList,
} from "lucide-react"

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "Texto",
  TEXTAREA: "Texto longo",
  NUMBER: "Numero",
  DECIMAL: "Decimal",
  DATE: "Data",
  DATETIME: "Data/Hora",
  SELECT: "Selecao",
  MULTISELECT: "Multi-selecao",
  CHECKBOX: "Checkbox",
  EMAIL: "E-mail",
  PHONE: "Telefone",
  URL: "URL",
  CPF_CNPJ: "CPF/CNPJ",
  CURRENCY: "Moeda",
  FILE: "Arquivo",
  USER_REFERENCE: "Usuario",
}

const FIELD_TYPE_COLORS: Record<string, string> = {
  TEXT: "bg-emerald-500/10 text-emerald-400",
  TEXTAREA: "bg-emerald-500/10 text-emerald-400",
  NUMBER: "bg-yellow-500/10 text-yellow-400",
  DECIMAL: "bg-yellow-500/10 text-yellow-400",
  CURRENCY: "bg-green-500/10 text-green-400",
  DATE: "bg-violet-50 text-violet-700",
  DATETIME: "bg-violet-50 text-violet-700",
  SELECT: "bg-green-500/10 text-green-400",
  MULTISELECT: "bg-green-500/10 text-green-400",
  CHECKBOX: "bg-teal-50 text-teal-700",
  EMAIL: "bg-rose-500/10 text-rose-400",
  PHONE: "bg-rose-500/10 text-rose-400",
  URL: "bg-teal-500/10 text-teal-300",
  CPF_CNPJ: "bg-orange-500/10 text-orange-400",
  FILE: "bg-foreground/[0.04] text-foreground/70",
  USER_REFERENCE: "bg-teal-500/10 text-teal-400",
}

const ENTITY_LABELS: Record<string, string> = {
  client: "Empresas",
  contact: "Pessoas",
  deal: "Negocios",
  product: "Produtos",
  proposal: "Propostas",
}

interface CustomField {
  id: string
  name: string
  label: string
  fieldType: string
  section: string
  isRequired: boolean
  isVisible: boolean
  order: number
  placeholder?: string | null
  helpText?: string | null
  defaultValue?: string | null
  options?: string | null
}

interface FormSection {
  id: string
  name: string
  label: string
  order: number
  isCollapsible: boolean
  isDefault: boolean
}

interface FormBuilderProps {
  entity: string
  fields: CustomField[]
  sections: FormSection[]
  loading: boolean
  onAddField: () => void
  onEditField: (field: CustomField) => void
  onDeleteField: (id: string) => Promise<void>
  onAddSection: () => void
}

export function FormBuilder({
  entity,
  fields,
  sections,
  loading,
  onAddField,
  onEditField,
  onDeleteField,
  onAddSection,
}: FormBuilderProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function toggleSection(sectionName: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionName)) {
        next.delete(sectionName)
      } else {
        next.add(sectionName)
      }
      return next
    })
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await onDeleteField(id)
    } finally {
      setDeletingId(null)
    }
  }

  // Group fields by section
  const allSectionNames = new Set<string>()
  for (const f of fields) {
    allSectionNames.add(f.section)
  }
  for (const s of sections) {
    allSectionNames.add(s.name)
  }

  const sectionMap = new Map<string, FormSection | null>()
  for (const name of allSectionNames) {
    sectionMap.set(
      name,
      sections.find((s) => s.name === name) ?? null,
    )
  }

  // Sort sections: those with a FormSection record come first by order, then "default"
  const sortedSectionNames = Array.from(allSectionNames).sort((a, b) => {
    const sa = sectionMap.get(a)
    const sb = sectionMap.get(b)
    if (a === "default") return -1
    if (b === "default") return 1
    return (sa?.order ?? 999) - (sb?.order ?? 999)
  })

  const fieldsBySection = new Map<string, CustomField[]>()
  for (const name of sortedSectionNames) {
    fieldsBySection.set(
      name,
      fields
        .filter((f) => f.section === name)
        .sort((a, b) => a.order - b.order),
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-foreground/[0.03]/60 px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {ENTITY_LABELS[entity] ?? entity}
          </h2>
          <p className="mt-1 text-sm text-foreground/50">
            {fields.length} campo{fields.length !== 1 ? "s" : ""} personalizado
            {fields.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddSection}
            className="inline-flex items-center gap-2 rounded-lg border border-foreground/10 bg-card px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.03]"
          >
            <LayoutList className="h-4 w-4" />
            Nova Secao
          </button>
          <button
            type="button"
            onClick={onAddField}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar Campo
          </button>
        </div>
      </div>

      {/* Sections */}
      {sortedSectionNames.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-foreground/10 bg-card py-16">
          <LayoutList className="mb-3 h-10 w-10 text-foreground/30" />
          <p className="text-sm font-medium text-foreground/50">
            Nenhum campo cadastrado
          </p>
          <p className="mt-1 text-xs text-foreground/40">
            Comece adicionando um campo ou uma secao.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {sortedSectionNames.map((sectionName) => {
          const sectionInfo = sectionMap.get(sectionName)
          const sectionLabel =
            sectionName === "default"
              ? "Padrao"
              : sectionInfo?.label ?? sectionName
          const sectionFields = fieldsBySection.get(sectionName) ?? []
          const isCollapsed = collapsedSections.has(sectionName)

          return (
            <div
              key={sectionName}
              className="overflow-hidden rounded-lg glass-card"
            >
              {/* Section header */}
              <button
                type="button"
                onClick={() => toggleSection(sectionName)}
                className="flex w-full items-center gap-2 bg-foreground/[0.03] px-4 py-3 text-left transition-colors hover:bg-foreground/[0.04]"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-foreground/40" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-foreground/40" />
                )}
                <span className="text-sm font-semibold text-foreground/70">
                  {sectionLabel}
                </span>
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground/50">
                  {sectionFields.length}
                </span>
              </button>

              {/* Fields list */}
              {!isCollapsed && (
                <div className="divide-y divide-foreground/[0.04]">
                  {sectionFields.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-foreground/40">
                      Nenhum campo nesta secao
                    </div>
                  )}

                  {sectionFields.map((field) => (
                    <div
                      key={field.id}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03]/70"
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-foreground/30" />

                      {/* Label + name */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {field.label}
                          </span>
                          {field.isRequired && (
                            <Asterisk className="h-3 w-3 text-red-400" />
                          )}
                        </div>
                        <span className="text-xs text-foreground/40">
                          {field.name}
                        </span>
                      </div>

                      {/* Type badge */}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          FIELD_TYPE_COLORS[field.fieldType] ??
                          "bg-foreground/[0.04] text-foreground/70"
                        }`}
                      >
                        {FIELD_TYPE_LABELS[field.fieldType] ?? field.fieldType}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => onEditField(field)}
                          className="rounded-md p-1.5 text-foreground/40 transition-colors hover:bg-foreground/[0.04] hover:text-foreground/60"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(field.id)}
                          disabled={deletingId === field.id}
                          className="rounded-md p-1.5 text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletingId === field.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
