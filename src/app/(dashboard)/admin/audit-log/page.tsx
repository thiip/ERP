import Link from "next/link"
import { ArrowLeft, ScrollText } from "lucide-react"
import { getAuditLogs } from "@/actions/admin"
import { AuditLogTable } from "./audit-log-table"

interface AuditLogPageProps {
  searchParams: Promise<{
    page?: string
    userId?: string
    action?: string
    entity?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  const params = await searchParams

  const filters = {
    page: params.page ? parseInt(params.page, 10) : 1,
    pageSize: 25,
    userId: params.userId || undefined,
    action: params.action || undefined,
    entity: params.entity || undefined,
    startDate: params.startDate || undefined,
    endDate: params.endDate || undefined,
  }

  const result = await getAuditLogs(filters)

  return (
    <div className="min-h-screen bg-foreground/[0.03]/60 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Administração
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Registros (Audit Log)
          </h1>
          <p className="mt-1 text-sm text-foreground/50">
            Histórico de todas as ações realizadas no sistema.
          </p>
        </div>

        {result.logs.length === 0 && !params.userId && !params.action && !params.entity && !params.startDate ? (
          <div className="rounded-lg glass-card">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
                <ScrollText className="h-6 w-6 text-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground">
                Nenhum registro encontrado
              </h3>
              <p className="mt-1 text-sm text-foreground/50">
                Os registros de atividade aparecerão aqui.
              </p>
            </div>
          </div>
        ) : (
          <AuditLogTable
            logs={JSON.parse(JSON.stringify(result.logs))}
            total={result.total}
            page={result.page}
            pageSize={result.pageSize}
            totalPages={result.totalPages}
            currentFilters={{
              userId: params.userId ?? "",
              action: params.action ?? "",
              entity: params.entity ?? "",
              startDate: params.startDate ?? "",
              endDate: params.endDate ?? "",
            }}
          />
        )}
      </div>
    </div>
  )
}
