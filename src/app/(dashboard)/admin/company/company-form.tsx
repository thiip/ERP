"use client"

import { useTransition, useState } from "react"
import { updateCompanyData } from "@/actions/admin"
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileText,
  MapPin,
  Phone,
  Mail,
} from "lucide-react"

interface CompanyData {
  id: string
  name: string
  tradeName: string | null
  cnpj: string
  address: string | null
  phone: string | null
  email: string | null
}

export function CompanyForm({ company }: { company: CompanyData }) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const [form, setForm] = useState({
    name: company.name ?? "",
    tradeName: company.tradeName ?? "",
    cnpj: company.cnpj ?? "",
    address: company.address ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
  })

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (feedback) setFeedback(null)
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateCompanyData({
          name: form.name,
          tradeName: form.tradeName || null,
          cnpj: form.cnpj,
          address: form.address || null,
          phone: form.phone || null,
          email: form.email || null,
        })
        setFeedback({
          type: "success",
          message: "Dados da empresa atualizados com sucesso.",
        })
      } catch {
        setFeedback({
          type: "error",
          message: "Erro ao salvar os dados. Tente novamente.",
        })
      }
    })
  }

  const fields = [
    {
      key: "name",
      label: "Razão Social",
      placeholder: "Nome legal da empresa",
      icon: Building2,
      required: true,
    },
    {
      key: "tradeName",
      label: "Nome Fantasia",
      placeholder: "Nome comercial",
      icon: Building2,
      required: false,
    },
    {
      key: "cnpj",
      label: "CNPJ",
      placeholder: "00.000.000/0000-00",
      icon: FileText,
      required: true,
    },
    {
      key: "address",
      label: "Endereço",
      placeholder: "Endereço completo",
      icon: MapPin,
      required: false,
    },
    {
      key: "phone",
      label: "Telefone",
      placeholder: "(00) 00000-0000",
      icon: Phone,
      required: false,
    },
    {
      key: "email",
      label: "E-mail",
      placeholder: "contato@empresa.com.br",
      icon: Mail,
      required: false,
    },
  ]

  return (
    <div className="rounded-lg glass-card">
      <div className="border-b border-foreground/[0.04] px-6 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Informações Cadastrais
        </h2>
        <p className="mt-0.5 text-xs text-foreground/50">
          Campos marcados com * são obrigatórios.
        </p>
      </div>

      <div className="divide-y divide-foreground/[0.04] px-6">
        {fields.map((field) => {
          const Icon = field.icon
          return (
            <div
              key={field.key}
              className="flex flex-col gap-1.5 py-4 sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex items-center gap-2 sm:w-44 sm:shrink-0">
                <Icon className="h-4 w-4 text-foreground/40" />
                <label
                  htmlFor={field.key}
                  className="text-sm font-medium text-foreground/70"
                >
                  {field.label}
                  {field.required && (
                    <span className="ml-0.5 text-red-500">*</span>
                  )}
                </label>
              </div>
              <input
                id={field.key}
                type={field.key === "email" ? "email" : "text"}
                value={form[field.key as keyof typeof form]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full rounded-md border border-foreground/10 px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t border-foreground/[0.04] px-6 py-4">
        <div>
          {feedback && (
            <div
              className={`flex items-center gap-2 text-sm ${
                feedback.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {feedback.message}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !form.name || !form.cnpj}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Alterações
        </button>
      </div>
    </div>
  )
}
