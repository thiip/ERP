"use client"

import { useTransition, useState } from "react"
import { updateSystemConfig } from "@/actions/admin"
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Bell,
  Shield,
  Settings,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettingInput = "text" | "select" | "toggle" | "number"

interface SettingField {
  key: string
  label: string
  description: string
  type: SettingInput
  options?: { value: string; label: string }[]
}

interface SettingSection {
  title: string
  icon: LucideIcon
  fields: SettingField[]
}

// ---------------------------------------------------------------------------
// Sections definition
// ---------------------------------------------------------------------------

const sections: SettingSection[] = [
  {
    title: "Regional",
    icon: Globe,
    fields: [
      {
        key: "currency",
        label: "Moeda",
        description: "Moeda padrão utilizada no sistema para valores monetários.",
        type: "select",
        options: [
          { value: "BRL", label: "BRL - Real Brasileiro" },
          { value: "USD", label: "USD - Dólar Americano" },
          { value: "EUR", label: "EUR - Euro" },
        ],
      },
      {
        key: "timezone",
        label: "Fuso Horário",
        description: "Fuso horário utilizado para datas e horários do sistema.",
        type: "select",
        options: [
          { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
          { value: "America/Manaus", label: "Manaus (GMT-4)" },
          { value: "America/Belem", label: "Belém (GMT-3)" },
          { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
          { value: "America/New_York", label: "Nova York (GMT-5)" },
          { value: "Europe/Lisbon", label: "Lisboa (GMT+0)" },
        ],
      },
      {
        key: "date_format",
        label: "Formato de Data",
        description: "Formato de exibição das datas em todo o sistema.",
        type: "select",
        options: [
          { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
          { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
          { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
        ],
      },
    ],
  },
  {
    title: "Notificações",
    icon: Bell,
    fields: [
      {
        key: "email_notifications",
        label: "Notificações por Email",
        description:
          "Habilita o envio de notificações por e-mail para os usuários.",
        type: "toggle",
      },
      {
        key: "daily_digest",
        label: "Resumo Diário",
        description:
          "Envia um resumo diário por e-mail com as atividades do dia.",
        type: "toggle",
      },
    ],
  },
  {
    title: "Segurança",
    icon: Shield,
    fields: [
      {
        key: "session_timeout",
        label: "Sessão Timeout",
        description:
          "Tempo de inatividade (em minutos) antes de encerrar a sessão.",
        type: "number",
      },
      {
        key: "two_factor_auth",
        label: "Autenticação Dois Fatores",
        description:
          "Exige autenticação em dois fatores para login dos usuários.",
        type: "toggle",
      },
      {
        key: "password_complexity",
        label: "Complexidade de Senha",
        description: "Nível de complexidade exigido para senhas dos usuários.",
        type: "select",
        options: [
          { value: "low", label: "Baixa - mínimo 6 caracteres" },
          { value: "medium", label: "Média - 8 caracteres com números" },
          { value: "high", label: "Alta - 12 caracteres, números e símbolos" },
        ],
      },
    ],
  },
  {
    title: "Geral",
    icon: Settings,
    fields: [
      {
        key: "theme",
        label: "Tema do Sistema",
        description: "Aparência visual do sistema.",
        type: "select",
        options: [
          { value: "light", label: "Claro" },
          { value: "dark", label: "Escuro" },
          { value: "auto", label: "Automático" },
        ],
      },
      {
        key: "language",
        label: "Idioma",
        description: "Idioma padrão da interface do sistema.",
        type: "select",
        options: [
          { value: "pt-BR", label: "Português (Brasil)" },
          { value: "en", label: "English" },
          { value: "es", label: "Español" },
        ],
      },
      {
        key: "fiscal_year_start",
        label: "Início do Ano Fiscal",
        description: "Mês de início do ano fiscal da empresa.",
        type: "select",
        options: [
          { value: "01", label: "Janeiro" },
          { value: "02", label: "Fevereiro" },
          { value: "03", label: "Março" },
          { value: "04", label: "Abril" },
          { value: "05", label: "Maio" },
          { value: "06", label: "Junho" },
          { value: "07", label: "Julho" },
          { value: "08", label: "Agosto" },
          { value: "09", label: "Setembro" },
          { value: "10", label: "Outubro" },
          { value: "11", label: "Novembro" },
          { value: "12", label: "Dezembro" },
        ],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Defaults for keys not yet in the DB
// ---------------------------------------------------------------------------

const DEFAULTS: Record<string, string> = {
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  date_format: "DD/MM/YYYY",
  email_notifications: "true",
  daily_digest: "false",
  session_timeout: "30",
  two_factor_auth: "false",
  password_complexity: "medium",
  theme: "light",
  language: "pt-BR",
  fiscal_year_start: "01",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsForm({
  config,
}: {
  config: Record<string, string>
}) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Merge server config with defaults
  const [values, setValues] = useState<Record<string, string>>(() => {
    const merged = { ...DEFAULTS }
    for (const [k, v] of Object.entries(config)) {
      merged[k] = v
    }
    return merged
  })

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (feedback) setFeedback(null)
  }

  function handleSave() {
    const settings = Object.entries(values).map(([key, value]) => ({
      key,
      value,
    }))

    startTransition(async () => {
      try {
        await updateSystemConfig(settings)
        setFeedback({
          type: "success",
          message: "Configurações salvas com sucesso.",
        })
      } catch {
        setFeedback({
          type: "error",
          message: "Erro ao salvar configurações. Tente novamente.",
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const SectionIcon = section.icon
        return (
          <div
            key={section.title}
            className="rounded-lg glass-card"
          >
            {/* Section header */}
            <div className="flex items-center gap-2 border-b border-foreground/[0.04] px-6 py-4">
              <SectionIcon className="h-4 w-4 text-teal-600" />
              <h2 className="text-sm font-semibold text-foreground">
                {section.title}
              </h2>
            </div>

            {/* Rows */}
            <div className="divide-y divide-foreground/[0.04]">
              {section.fields.map((field) => (
                <div
                  key={field.key}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Label + description */}
                  <div className="sm:max-w-sm">
                    <p className="text-sm font-medium text-foreground">
                      {field.label}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {field.description}
                    </p>
                  </div>

                  {/* Input */}
                  <div className="shrink-0 sm:w-56">
                    {field.type === "select" && field.options && (
                      <select
                        value={values[field.key] ?? ""}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === "number" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={1440}
                          value={values[field.key] ?? ""}
                          onChange={(e) => setValue(field.key, e.target.value)}
                          className="w-full rounded-md border border-foreground/10 px-3 py-2 text-sm text-foreground focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        <span className="shrink-0 text-xs text-foreground/50">
                          min
                        </span>
                      </div>
                    )}

                    {field.type === "text" && (
                      <input
                        type="text"
                        value={values[field.key] ?? ""}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        className="w-full rounded-md border border-foreground/10 px-3 py-2 text-sm text-foreground focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    )}

                    {field.type === "toggle" && (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={values[field.key] === "true"}
                        onClick={() =>
                          setValue(
                            field.key,
                            values[field.key] === "true" ? "false" : "true"
                          )
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                          values[field.key] === "true"
                            ? "bg-teal-600"
                            : "bg-foreground/10"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full glass-card ring-0 transition-transform ${
                            values[field.key] === "true"
                              ? "translate-x-5"
                              : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Footer with save */}
      <div className="flex items-center justify-between rounded-lg glass-card px-6 py-4">
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
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Configurações
        </button>
      </div>
    </div>
  )
}
