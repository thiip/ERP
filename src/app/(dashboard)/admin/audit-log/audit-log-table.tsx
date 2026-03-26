"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  create: { label: "Criação", className: "bg-green-100 text-green-700" },
  update: { label: "Atualização", className: "bg-emerald-500/10 text-emerald-400" },
  delete: { label: "Exclusão", className: "bg-red-500/10 text-red-400" },
  login: { label: "Login", className: "bg-teal-500/10 text-teal-400" },
  logout: { label: "Logout", className: "bg-foreground/[0.04] text-foreground/70" },
  export: { label: "Exportação", className: "bg-yellow-500/10 text-yellow-400" },
  import: { label: "Importação", className: "bg-teal-100 text-teal-700" },
  approve: { label: "Aprovação", className: "bg-emerald-500/10 text-emerald-400" },
  reject: { label: "Rejeição", className: "bg-orange-500/10 text-orange-400" },
}

const ENTITY_OPTIONS = [
  "organization",
  "contact",
  "deal",
  "proposal",
  "invoice",
  "contract",
  "product",
  "user",
  "integration",
  "webhook",
  "api_key",
]

const ACTION_OPTIONS = [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "export",
  "import",
  "approve",
  "reject",
]

interface AuditLog {
  id: string
  userId: string
  action: string
  entity: string
  entityId: string | null
  changes: string | null
  ipAddress: string | null
  createdAt: string
}

interface AuditLogTableProps {
  logs: AuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  currentFilters: {
    userId: string
    action: string
    entity: string
    startDate: string
    endDate: string
  }
}

export function AuditLogTable({
  logs,
  total,
  page,
  pageSize,
  totalPages,
  currentFilters,
}: AuditLogTableProps) {
  const router = useRouter()
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [filtersVisible, setFiltersVisible] = useState(
    !!(
      currentFilters.userId ||
      currentFilters.action ||
      currentFilters.entity ||
      currentFilters.startDate ||
      currentFilters.endDate
    )
  )

  // Filter state
  const [userId, setUserId] = useState(currentFilters.userId)
  const [action, setAction] = useState(currentFilters.action)
  const [entity, setEntity] = useState(currentFilters.entity)
  const [startDate, setStartDate] = useState(currentFilters.startDate)
  const [endDate, setEndDate] = useState(currentFilters.endDate)

  function applyFilters() {
    const params = new URLSearchParams()
    if (userId) params.set("userId", userId)
    if (action) params.set("action", action)
    if (entity) params.set("entity", entity)
    if (startDate) params.set("startDate", startDate)
    if (endDate) params.set("endDate", endDate)
    params.set("page", "1")
    router.push(`/admin/audit-log?${params.toString()}`)
  }

  function clearFilters() {
    setUserId("")
    setAction("")
    setEntity("")
    setStartDate("")
    setEndDate("")
    router.push("/admin/audit-log")
  }

  function goToPage(p: number) {
    const params = new URLSearchParams()
    if (currentFilters.userId) params.set("userId", currentFilters.userId)
    if (currentFilters.action) params.set("action", currentFilters.action)
    if (currentFilters.entity) params.set("entity", currentFilters.entity)
    if (currentFilters.startDate) params.set("startDate", currentFilters.startDate)
    if (currentFilters.endDate) params.set("endDate", currentFilters.endDate)
    params.set("page", String(p))
    router.push(`/admin/audit-log?${params.toString()}`)
  }

  function parseChanges(changes: string | null): Record<string, unknown> | null {
    if (!changes) return null
    try {
      return JSON.parse(changes)
    } catch {
      return null
    }
  }

  const hasActiveFilters = !!(
    currentFilters.userId ||
    currentFilters.action ||
    currentFilters.entity ||
    currentFilters.startDate ||
    currentFilters.endDate
  )

  return (
    <div>
      {/* Filters */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersVisible(!filtersVisible)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">
                !
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Limpar filtros
            </Button>
          )}
        </div>

        {filtersVisible && (
          <div className="mt-3 rounded-lg glass-card p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="grid gap-1.5">
                <Label htmlFor="filter-user" className="text-xs">
                  ID do Usuário
                </Label>
                <Input
                  id="filter-user"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="ID do usuário"
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="filter-action" className="text-xs">
                  Ação
                </Label>
                <select
                  id="filter-action"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="h-8 rounded-lg glass-card px-2 text-sm text-foreground/70 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Todas</option>
                  {ACTION_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {ACTION_BADGE[a]?.label ?? a}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="filter-entity" className="text-xs">
                  Entidade
                </Label>
                <select
                  id="filter-entity"
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                  className="h-8 rounded-lg glass-card px-2 text-sm text-foreground/70 outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Todas</option>
                  {ENTITY_OPTIONS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="filter-start" className="text-xs">
                  Data início
                </Label>
                <Input
                  id="filter-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="filter-end" className="text-xs">
                  Data fim
                </Label>
                <Input
                  id="filter-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={applyFilters}>
                Aplicar Filtros
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg glass-card">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-sm font-medium text-foreground">
              Nenhum registro encontrado
            </h3>
            <p className="mt-1 text-sm text-foreground/50">
              Tente ajustar os filtros para encontrar registros.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID da Entidade</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const badge = ACTION_BADGE[log.action] ?? {
                  label: log.action,
                  className: "bg-foreground/[0.04] text-foreground/70",
                }
                const changes = parseChanges(log.changes)
                const isExpanded = expandedRow === log.id

                return (
                  <>
                    <TableRow
                      key={log.id}
                      className={changes ? "cursor-pointer" : ""}
                      onClick={() =>
                        changes &&
                        setExpandedRow(isExpanded ? null : log.id)
                      }
                    >
                      <TableCell className="w-10 text-center">
                        {changes && (
                          <span className="text-foreground/40">
                            {isExpanded ? (
                              <ChevronUp className="inline h-4 w-4" />
                            ) : (
                              <ChevronDown className="inline h-4 w-4" />
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-foreground/60">
                        {new Date(log.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/70">
                        <code className="rounded bg-foreground/[0.04] px-1.5 py-0.5 text-xs">
                          {log.userId.slice(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-foreground/70">
                        {log.entity}
                      </TableCell>
                      <TableCell className="text-sm text-foreground/50">
                        {log.entityId ? (
                          <code className="rounded bg-foreground/[0.04] px-1.5 py-0.5 text-xs">
                            {log.entityId.slice(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-foreground/40">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-foreground/40">
                        {log.ipAddress ?? "-"}
                      </TableCell>
                    </TableRow>
                    {isExpanded && changes && (
                      <TableRow key={`${log.id}-details`}>
                        <TableCell colSpan={7} className="bg-foreground/[0.03] p-4">
                          <div className="text-xs">
                            <p className="mb-2 font-semibold text-foreground/70">
                              Alterações:
                            </p>
                            <pre className="max-h-48 overflow-auto rounded-lg bg-foreground p-3 text-gray-100">
                              {JSON.stringify(changes, null, 2)}
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-foreground/50">
            Mostrando {(page - 1) * pageSize + 1} a{" "}
            {Math.min(page * pageSize, total)} de {total} registros
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Anterior
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "outline"}
                    size="icon-sm"
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
            >
              Próximo
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
