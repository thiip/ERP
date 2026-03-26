import Link from "next/link"
import { ArrowLeft, Plug } from "lucide-react"
import {
  getIntegrations,
  getAvailableIntegrations,
  createIntegration,
  toggleIntegration,
  deleteIntegration,
} from "@/actions/admin"
import { IntegrationCards } from "./integration-cards"

export default async function IntegrationsPage() {
  const [integrations, availableProviders] = await Promise.all([
    getIntegrations(),
    getAvailableIntegrations(),
  ])

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
            Integrações
          </h1>
          <p className="mt-1 text-sm text-foreground/50">
            Conecte ferramentas e serviços externos ao seu sistema.
          </p>
        </div>

        {availableProviders.length === 0 && integrations.length === 0 ? (
          <div className="rounded-lg glass-card">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
                <Plug className="h-6 w-6 text-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground">
                Nenhuma integração disponível
              </h3>
              <p className="mt-1 text-sm text-foreground/50">
                Não há integrações configuráveis no momento.
              </p>
            </div>
          </div>
        ) : (
          <IntegrationCards
            integrations={JSON.parse(JSON.stringify(integrations))}
            availableProviders={availableProviders}
            createAction={createIntegration}
            toggleAction={toggleIntegration}
            deleteAction={deleteIntegration}
          />
        )}
      </div>
    </div>
  )
}
