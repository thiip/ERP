import Link from "next/link"
import {
  ArrowLeft,
  ListOrdered,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import { getProcessingQueue } from "@/actions/admin"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const STATUS_BADGE: Record<
  string,
  { label: string; className: string; icon: typeof Clock }
> = {
  PENDING: {
    label: "Pendente",
    className: "bg-foreground/[0.04] text-foreground/70",
    icon: Clock,
  },
  PROCESSING: {
    label: "Processando",
    className: "bg-emerald-500/10 text-emerald-400",
    icon: Loader2,
  },
  COMPLETED: {
    label: "Concluído",
    className: "bg-green-100 text-green-400",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Falhou",
    className: "bg-red-500/10 text-red-400",
    icon: XCircle,
  },
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function QueuePage() {
  const items = await getProcessingQueue()

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
            Fila de Processamento
          </h1>
          <p className="mt-1 text-sm text-foreground/50">
            Acompanhe o status das tarefas em processamento no sistema.
          </p>
        </div>

        <div className="rounded-lg glass-card">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
                <ListOrdered className="h-6 w-6 text-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground">
                Nenhum item na fila
              </h3>
              <p className="mt-1 text-sm text-foreground/50">
                Não há tarefas em processamento no momento.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Iniciado em</TableHead>
                  <TableHead>Concluído em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const badge = STATUS_BADGE[item.status] ?? {
                    label: item.status,
                    className: "bg-foreground/[0.04] text-foreground/70",
                    icon: Clock,
                  }
                  const StatusIcon = badge.icon
                  const isProcessing = item.status === "PROCESSING"

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {item.type}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-foreground/50">
                        {item.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          <StatusIcon
                            className={`h-3 w-3 ${isProcessing ? "animate-spin" : ""}`}
                          />
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-foreground/[0.04]">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.status === "COMPLETED"
                                  ? "bg-green-500/100"
                                  : item.status === "FAILED"
                                    ? "bg-red-500/100"
                                    : item.status === "PROCESSING"
                                      ? "bg-emerald-500/100"
                                      : "bg-foreground/20"
                              }`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-foreground/50">
                            {item.progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/50">
                        {formatDate(item.startedAt)}
                      </TableCell>
                      <TableCell className="text-xs text-foreground/50">
                        {formatDate(item.completedAt)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
