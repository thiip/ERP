"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getFormSections,
  createFormSection,
} from "@/actions/admin"
import { EntitySidebar } from "./entity-sidebar"
import { FormBuilder } from "./form-builder"
import { FieldDialog, type FieldFormData } from "./field-dialog"
import { SectionDialog, type SectionFormData } from "./section-dialog"

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

export default function FieldsPage() {
  const [selectedEntity, setSelectedEntity] = useState("client")
  const [fields, setFields] = useState<CustomField[]>([])
  const [sections, setSections] = useState<FormSection[]>([])
  const [loading, setLoading] = useState(true)

  // Field dialog state
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<FieldFormData | null>(null)

  // Section dialog state
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [fieldsData, sectionsData] = await Promise.all([
        getCustomFields(selectedEntity),
        getFormSections(selectedEntity),
      ])
      setFields(fieldsData as CustomField[])
      setSections(sectionsData as FormSection[])
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedEntity])

  useEffect(() => {
    loadData()
  }, [loadData])

  // --- Field handlers ---

  function handleAddField() {
    setEditingField(null)
    setFieldDialogOpen(true)
  }

  function handleEditField(field: CustomField) {
    setEditingField({
      id: field.id,
      name: field.name,
      label: field.label,
      fieldType: field.fieldType,
      section: field.section,
      isRequired: field.isRequired,
      defaultValue: field.defaultValue ?? "",
      placeholder: field.placeholder ?? "",
      helpText: field.helpText ?? "",
      options: field.options ?? "",
    })
    setFieldDialogOpen(true)
  }

  async function handleFieldSubmit(data: FieldFormData) {
    if (data.id) {
      await updateCustomField(data.id, {
        label: data.label,
        fieldType: data.fieldType as never,
        section: data.section,
        isRequired: data.isRequired,
        defaultValue: data.defaultValue || null,
        placeholder: data.placeholder || null,
        helpText: data.helpText || null,
        options: data.options || null,
      })
    } else {
      await createCustomField({
        entity: selectedEntity,
        name: data.name,
        label: data.label,
        fieldType: data.fieldType as never,
        section: data.section,
        isRequired: data.isRequired,
        defaultValue: data.defaultValue || undefined,
        placeholder: data.placeholder || undefined,
        helpText: data.helpText || undefined,
        options: data.options || undefined,
        order: fields.length,
      })
    }
    await loadData()
  }

  async function handleDeleteField(id: string) {
    await deleteCustomField(id)
    await loadData()
  }

  // --- Section handlers ---

  function handleAddSection() {
    setSectionDialogOpen(true)
  }

  async function handleSectionSubmit(data: SectionFormData) {
    await createFormSection({
      entity: selectedEntity,
      name: data.name,
      label: data.label,
      isCollapsible: data.isCollapsible,
      order: sections.length,
    })
    await loadData()
  }

  return (
    <div className="flex h-screen flex-col bg-foreground/[0.03]/60">
      {/* Top bar */}
      <div className="border-b border-foreground/[0.08] bg-card px-6 py-4">
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Administracao
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Campos e Formularios
        </h1>
        <p className="mt-1 text-sm text-foreground/50">
          Gerencie os campos personalizados e secoes de formulario de cada
          entidade.
        </p>
      </div>

      {/* Body: sidebar + builder */}
      <div className="flex min-h-0 flex-1">
        <EntitySidebar
          selectedEntity={selectedEntity}
          onSelectEntity={setSelectedEntity}
        />

        <FormBuilder
          entity={selectedEntity}
          fields={fields}
          sections={sections}
          loading={loading}
          onAddField={handleAddField}
          onEditField={handleEditField}
          onDeleteField={handleDeleteField}
          onAddSection={handleAddSection}
        />
      </div>

      {/* Dialogs */}
      <FieldDialog
        isOpen={fieldDialogOpen}
        onClose={() => setFieldDialogOpen(false)}
        onSubmit={handleFieldSubmit}
        sections={sections}
        initialData={editingField}
      />

      <SectionDialog
        isOpen={sectionDialogOpen}
        onClose={() => setSectionDialogOpen(false)}
        onSubmit={handleSectionSubmit}
      />
    </div>
  )
}
