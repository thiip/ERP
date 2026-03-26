"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  UsersRound,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  UserPlus,
  UserMinus,
  Loader2,
  Crown,
} from "lucide-react"
import {
  getUserTeams,
  createUserTeam,
  updateUserTeam,
  deleteUserTeam,
  addTeamMember,
  removeTeamMember,
  getUsers,
} from "@/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

interface TeamMember {
  teamId: string
  userId: string
  role: string
}

interface Team {
  id: string
  name: string
  description: string | null
  leaderId: string | null
  members: TeamMember[]
}

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      const [t, u] = await Promise.all([getUserTeams(), getUsers()])
      setTeams(t as Team[])
      setUsers(u as User[])
    })
  }, [])

  async function reload() {
    const t = await getUserTeams()
    setTeams(t as Team[])
  }

  function handleCreate() {
    setEditingTeam(null)
    setDialogOpen(true)
  }

  function handleEdit(team: Team) {
    setEditingTeam(team)
    setDialogOpen(true)
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const leaderId = formData.get("leaderId") as string

    startTransition(async () => {
      try {
        if (editingTeam) {
          await updateUserTeam(editingTeam.id, {
            name,
            description: description || null,
            leaderId: leaderId || null,
          })
        } else {
          await createUserTeam({
            name,
            description: description || undefined,
            leaderId: leaderId || undefined,
          })
        }
        setDialogOpen(false)
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar equipe")
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteUserTeam(id)
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir equipe")
      }
    })
  }

  function openAddMember(teamId: string) {
    setAddMemberTeamId(teamId)
    setAddMemberDialogOpen(true)
  }

  function handleAddMember(formData: FormData) {
    const userId = formData.get("userId") as string
    if (!addMemberTeamId || !userId) return

    startTransition(async () => {
      try {
        await addTeamMember(addMemberTeamId, userId)
        setAddMemberDialogOpen(false)
        await reload()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao adicionar membro",
        )
      }
    })
  }

  function handleRemoveMember(teamId: string, userId: string) {
    startTransition(async () => {
      try {
        await removeTeamMember(teamId, userId)
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao remover membro")
      }
    })
  }

  function getUserName(userId: string) {
    return users.find((u) => u.id === userId)?.name ?? "Usuário desconhecido"
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
              Equipes de Usuários
            </h1>
            <p className="mt-1 text-sm text-foreground/50">
              Organize os usuários em equipes para facilitar a gestão.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Nova Equipe
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {teams.length === 0 ? (
          <div className="rounded-lg glass-card">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
                <UsersRound className="h-6 w-6 text-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground">
                Nenhuma equipe cadastrada
              </h3>
              <p className="mt-1 text-sm text-foreground/50">
                Crie a primeira equipe do sistema.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {teams.map((team) => {
              const isExpanded = expandedTeam === team.id
              const leaderName = team.leaderId
                ? getUserName(team.leaderId)
                : null

              return (
                <div
                  key={team.id}
                  className="rounded-lg glass-card"
                >
                  {/* Card header */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                      <UsersRound className="h-5 w-5" />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground">
                        {team.name}
                      </h3>
                      {team.description && (
                        <p className="mt-0.5 text-xs text-foreground/50">
                          {team.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-foreground/50">
                      {leaderName && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-yellow-400">
                          <Crown className="h-3 w-3" />
                          {leaderName}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-foreground/60">
                        {team.members.length} membro
                        {team.members.length !== 1 && "s"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(team)}
                        aria-label="Editar equipe"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => handleDelete(team.id)}
                        disabled={isPending}
                        aria-label="Excluir equipe"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setExpandedTeam(isExpanded ? null : team.id)
                        }
                        aria-label={
                          isExpanded ? "Recolher membros" : "Expandir membros"
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded members */}
                  {isExpanded && (
                    <div className="border-t border-foreground/[0.04] bg-foreground/[0.02] px-5 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                          Membros
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddMember(team.id)}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Adicionar Membro
                        </Button>
                      </div>

                      {team.members.length === 0 ? (
                        <p className="py-4 text-center text-sm text-foreground/40">
                          Nenhum membro nesta equipe.
                        </p>
                      ) : (
                        <ul className="divide-y divide-foreground/[0.04]">
                          {team.members.map((member) => (
                            <li
                              key={`${member.teamId}-${member.userId}`}
                              className="flex items-center justify-between py-2"
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/10 text-teal-600">
                                  <span className="text-xs font-medium">
                                    {getUserName(member.userId)
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-sm text-foreground/70">
                                  {getUserName(member.userId)}
                                </span>
                                <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-xs text-foreground/50">
                                  {member.role}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  handleRemoveMember(team.id, member.userId)
                                }
                                disabled={isPending}
                                aria-label="Remover membro"
                              >
                                <UserMinus className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Create / Edit Team Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? "Editar Equipe" : "Nova Equipe"}
              </DialogTitle>
            </DialogHeader>

            <form action={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome da Equipe</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Equipe Comercial"
                  defaultValue={editingTeam?.name ?? ""}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Descrição da equipe"
                  defaultValue={editingTeam?.description ?? ""}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="leaderId">Líder</Label>
                <select
                  id="leaderId"
                  name="leaderId"
                  defaultValue={editingTeam?.leaderId ?? ""}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Sem líder</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingTeam ? "Salvar Alterações" : "Criar Equipe"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog
          open={addMemberDialogOpen}
          onOpenChange={setAddMemberDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Membro</DialogTitle>
            </DialogHeader>

            <form action={handleAddMember} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="userId">Usuário</Label>
                <select
                  id="userId"
                  name="userId"
                  required
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Selecione um usuário</option>
                  {users
                    .filter((u) => u.isActive)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>

              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
