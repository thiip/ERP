"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  X,
  ListOrdered,
  UserCheck,
} from "lucide-react"
import {
  getApprovalFlows,
  createApprovalFlow,
  updateApprovalFlow,
  deleteApprovalFlow,
} from "@/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import type { Role } from "@/generated/prisma/client"

interface ApprovalStep {
  id: string
  approverRole: Role | null
  approverUserId: string | null
  order: number
  isRequired: boolean
}

interface ApprovalFlow {
  id: string
  name: string
  entity: string
  description: string | null
  isActive: boolean
  steps: ApprovalStep[]
  _count: { requests: number }
}

interface StepDraft {
  approverRole: Role | ""
  approverUserId: string
  order: number
  isRequired: boolean
}

const ENTITIES = [
  { value: "proposal", label: "Proposta" },
  { value: "deal", label: "Negócio" },
  { value: "contract", label: "Contrato" },
  { value: "expense", label: "Despesa" },
]

const ENTITY_BADGE: Record<string, { label: string; className: string }> = {
  proposal: { label: "Proposta", className: "bg-emerald-500/10 text-emerald-400" },
  deal: { label: "Negócio", className: "bg-green-100 text-green-400" },
  contract: { label: "Contrato", className: "bg-teal-500/10 text-teal-400" },
  expense: { label: "Despesa", className: "bg-orange-500/10 text-orange-400" },
}

const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "MANAGER", label: "Gerente" },
  { value: "SALES", label: "Vendas" },
  { value: "PRODUCTION", label: "Produção" },
  { value: "FINANCE", label: "Financeiro" },
]

export default function ApprovalFlowsPage() {
  const [flows, setFlows] = useState<ApprovalFlow[]>([])
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFlow, setEditingFlow] = useState<ApprovalFlow | null>(null)
  const [steps, setSteps] = useState<StepDraft[]>([])
  const [isActiveChecked, setIsActiveChecked] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      const f = await getApprovalFlows()
      setFlows(f as ApprovalFlow[])
    })
  }, [])

  async function reload() {
    const f = await getApprovalFlows()
    setFlows(f as ApprovalFlow[])
  }

  function handleCreate() {
    setEditingFlow(null)
    setSteps([])
    setIsActiveChecked(true)
    setDialogOpen(true)
  }

  function handleEdit(flow: ApprovalFlow) {
    setEditingFlow(flow)
    setIsActiveChecked(flow.isActive)
    setSteps(
      flow.steps.map((s) => ({
        approverRole: s.approverRole ?? "",
        approverUserId: s.approverUserId ?? "",
        order: s.order,
        isRequired: s.isRequired,
      })),
    )
    setDialogOpen(true)
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      {
        approverRole: "",
        approverUserId: "",
        order: prev.length,
        isRequired: true,
      },
    ])
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  function updateStep(index: number, field: keyof StepDraft, value: unknown) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    const name = formData.get("name") as string
    const entity = formData.get("entity") as string
    const description = formData.get("description") as string
    const isActive = isActiveChecked

    startTransition(async () => {
      try {
        if (editingFlow) {
          await updateApprovalFlow(editingFlow.id, {
            name,
            entity,
            description: description || null,
            isActive,
          })
        } else {
          await createApprovalFlow({
            name,
            entity,
            description: description || undefined,
            isActive,
            steps: steps.map((s, idx) => ({
              approverRole: (s.approverRole as Role) || undefined,
              approverUserId: s.approverUserId || undefined,
              order: idx,
              isRequired: s.isRequired,
            })),
          })
        }
        setDialogOpen(false)
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar fluxo")
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteApprovalFlow(id)
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir fluxo")
      }
    })
  }

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

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Fluxos de Aprovação
            </h1>
            <p className="mt-1 text-sm text-foreground/50">
              Configure fluxos de aprovação com etapas e aprovadores para
              propostas, contratos e despesas.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Novo Fluxo
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {flows.length === 0 ? (
          <div className="rounded-lg glass-card">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
                <CheckCircle className="h-6 w-6 text-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground">
                Nenhum fluxo cadastrado
              </h3>
              <p className="mt-1 text-sm text-foreground/50">
                Crie o primeiro fluxo de aprovação.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {flows.map((flow) => {
              const entityBadge = ENTITY_BADGE[flow.entity] ?? {
                label: flow.entity,
                className: "bg-foreground/[0.04] text-foreground/70",
              }

              return (
                <div
                  key={flow.id}
                  className="rounded-lg glass-card p-5"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {flow.name}
                        </h3>
                        <span
                          className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${entityBadge.className}`}
                        >
                          {entityBadge.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(flow)}
                        aria-label="Editar fluxo"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => handleDelete(flow.id)}
                        disabled={isPending}
                        aria-label="Excluir fluxo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {flow.description && (
                    <p className="mb-3 text-xs text-foreground/50">
                      {flow.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1 text-xs text-foreground/50">
                      <ListOrdered className="h-3 w-3" />
                      {flow.steps.length} etapa
                      {flow.steps.length !== 1 && "s"}
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs text-foreground/50">
                      <UserCheck className="h-3 w-3" />
                      {flow._count.requests} solicitaç
                      {flow._count.requests !== 1 ? "ões" : "ão"}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        flow.isActive ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {flow.isActive ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {flow.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  {/* Steps preview */}
                  {flow.steps.length > 0 && (
                    <div className="mt-3 border-t border-foreground/[0.04] pt-3">
                      <ol className="space-y-1">
                        {flow.steps.map((step, idx) => (
                          <li
                            key={step.id}
                            className="flex items-center gap-2 text-xs text-foreground/60"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/[0.04] text-[10px] font-medium">
                              {idx + 1}
                            </span>
                            <span>
                              {step.approverRole
                                ? ROLES.find(
                                    (r) => r.value === step.approverRole,
                                  )?.label ?? step.approverRole
                                : "Aprovador específico"}
                            </span>
                            {step.isRequired && (
                              <span className="rounded bg-red-500/10 px-1 py-0.5 text-[10px] font-medium text-red-600">
                                Obrigatório
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Create / Edit Flow Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingFlow ? "Editar Fluxo" : "Novo Fluxo de Aprovação"}
              </DialogTitle>
            </DialogHeader>

            <form action={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Aprovação de Proposta"
                    defaultValue={editingFlow?.name ?? ""}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="entity">Entidade</Label>
                  <select
                    id="entity"
                    name="entity"
                    defaultValue={editingFlow?.entity ?? "proposal"}
                    required
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {ENTITIES.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Descrição do fluxo"
                  defaultValue={editingFlow?.description ?? ""}
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={isActiveChecked}
                  onCheckedChange={(v) => setIsActiveChecked(v)}
                />
                <Label htmlFor="isActive" className="text-sm">
                  Ativo
                </Label>
              </div>

              {/* Steps editor (only for creation) */}
              {!editingFlow && (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Etapas de Aprovação</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addStep}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar Etapa
                    </Button>
                  </div>

                  {steps.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-foreground/[0.08] px-4 py-6 text-center text-sm text-foreground/40">
                      Nenhuma etapa adicionada. Clique em &quot;Adicionar
                      Etapa&quot; para começar.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] p-3"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-xs font-medium text-teal-400">
                            {idx + 1}
                          </span>

                          <select
                            value={step.approverRole}
                            onChange={(e) =>
                              updateStep(
                                idx,
                                "approverRole",
                                e.target.value as Role,
                              )
                            }
                            className="h-7 flex-1 rounded-md border border-input bg-card px-2 text-xs outline-none"
                          >
                            <option value="">
                              Selecionar cargo aprovador
                            </option>
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>

                          <label className="flex items-center gap-1 text-xs text-foreground/60">
                            <input
                              type="checkbox"
                              checked={step.isRequired}
                              onChange={(e) =>
                                updateStep(
                                  idx,
                                  "isRequired",
                                  e.target.checked,
                                )
                              }
                              className="rounded"
                            />
                            Obrigatório
                          </label>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeStep(idx)}
                          >
                            <X className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingFlow ? "Salvar Alterações" : "Criar Fluxo"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
