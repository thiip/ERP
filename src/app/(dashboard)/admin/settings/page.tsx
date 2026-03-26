import Link from "next/link"
import { ArrowLeft, SlidersHorizontal } from "lucide-react"
import { getSystemConfig } from "@/actions/admin"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const config = await getSystemConfig()

  return (
    <div className="min-h-screen bg-foreground/[0.03]/60 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Administração
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Configurações do Sistema
              </h1>
              <p className="mt-0.5 text-sm text-foreground/50">
                Ajuste as configurações regionais, de segurança e gerais do sistema.
              </p>
            </div>
          </div>
        </div>

        <SettingsForm config={config} />
      </div>
    </div>
  )
}
