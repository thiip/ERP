"use client"

import { useState, useEffect, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
} from "lucide-react"
import {
  getUserProfiles,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
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

interface Profile {
  id: string
  name: string
  description: string | null
  permissions: string
  isDefault: boolean
}

interface Permissions {
  crm: { read: boolean; write: boolean }
  inventory: { read: boolean; write: boolean }
  production: { read: boolean; write: boolean }
  financial: { read: boolean; write: boolean }
  settings: { read: boolean; write: boolean }
}

const MODULES = [
  { key: "crm" as const, label: "CRM" },
  { key: "inventory" as const, label: "Estoque" },
  { key: "production" as const, label: "Produção" },
  { key: "financial" as const, label: "Financeiro" },
  { key: "settings" as const, label: "Configurações" },
]

function defaultPermissions(): Permissions {
  return {
    crm: { read: false, write: false },
    inventory: { read: false, write: false },
    production: { read: false, write: false },
    financial: { read: false, write: false },
    settings: { read: false, write: false },
  }
}

function parsePermissions(json: string): Permissions {
  try {
    const parsed = JSON.parse(json)
    return { ...defaultPermissions(), ...parsed }
  } catch {
    return defaultPermissions()
  }
}

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [permissions, setPermissions] = useState<Permissions>(
    defaultPermissions(),
  )
  const [isDefault, setIsDefault] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      const p = await getUserProfiles()
      setProfiles(p as Profile[])
    })
  }, [])

  async function reload() {
    const p = await getUserProfiles()
    setProfiles(p as Profile[])
  }

  function handleCreate() {
    setEditingProfile(null)
    setPermissions(defaultPermissions())
    setIsDefault(false)
    setDialogOpen(true)
  }

  function handleEdit(profile: Profile) {
    setEditingProfile(profile)
    setPermissions(parsePermissions(profile.permissions))
    setIsDefault(profile.isDefault)
    setDialogOpen(true)
  }

  function togglePermission(
    moduleKey: keyof Permissions,
    action: "read" | "write",
  ) {
    setPermissions((prev) => {
      const updated = { ...prev }
      updated[moduleKey] = { ...updated[moduleKey] }
      updated[moduleKey][action] = !updated[moduleKey][action]
      // If enabling write, also enable read
      if (action === "write" && updated[moduleKey].write) {
        updated[moduleKey].read = true
      }
      // If disabling read, also disable write
      if (action === "read" && !updated[moduleKey].read) {
        updated[moduleKey].write = false
      }
      return updated
    })
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const permissionsJson = JSON.stringify(permissions)

    startTransition(async () => {
      try {
        if (editingProfile) {
          await updateUserProfile(editingProfile.id, {
            name,
            description: description || null,
            permissions: permissionsJson,
            isDefault,
          })
        } else {
          await createUserProfile({
            name,
            description: description || undefined,
            permissions: permissionsJson,
            isDefault,
          })
        }
        setDialogOpen(false)
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar perfil")
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteUserProfile(id)
        await reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir perfil")
      }
    })
  }

  function summarizePermissions(json: string): string {
    const perms = parsePermissions(json)
    const parts: string[] = []
    for (const mod of MODULES) {
      const p = perms[mod.key]
      if (p.write) {
        parts.push(`${mod.label}: Leitura/Escrita`)
      } else if (p.read) {
        parts.push(`${mod.label}: Leitura`)
      }
    }
    return parts.length > 0 ? parts.join(", ") : "Sem permissões"
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
              Perfis de Usuário
            </h1>
            <p className="mt-1 text-sm text-foreground/50">
              Defina perfis com permissões para controlar o acesso ao sistema.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Novo Perfil
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {profiles.length === 0 ? (
          <div className="rounded-lg glass-card">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
                <Shield className="h-6 w-6 text-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground">
                Nenhum perfil cadastrado
              </h3>
              <p className="mt-1 text-sm text-foreground/50">
                Crie o primeiro perfil de permissões.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-lg glass-card p-5"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {profile.name}
                      </h3>
                      {profile.isDefault && (
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-600">
                          <Star className="h-3 w-3" />
                          Padrão
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleEdit(profile)}
                      aria-label="Editar perfil"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleDelete(profile.id)}
                      disabled={isPending}
                      aria-label="Excluir perfil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {profile.description && (
                  <p className="mb-3 text-xs text-foreground/50">
                    {profile.description}
                  </p>
                )}

                <p className="text-xs leading-relaxed text-foreground/60">
                  {summarizePermissions(profile.permissions)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit Profile Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingProfile ? "Editar Perfil" : "Novo Perfil"}
              </DialogTitle>
            </DialogHeader>

            <form action={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do Perfil</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Vendedor"
                  defaultValue={editingProfile?.name ?? ""}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Descrição do perfil"
                  defaultValue={editingProfile?.description ?? ""}
                />
              </div>

              <div className="grid gap-2">
                <Label>Permissões por Módulo</Label>
                <div className="rounded-lg border border-foreground/[0.08]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-foreground/[0.04] bg-foreground/[0.03]">
                        <th className="px-3 py-2 text-left text-xs font-medium text-foreground/50">
                          Módulo
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-foreground/50">
                          Leitura
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-foreground/50">
                          Escrita
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((mod) => (
                        <tr
                          key={mod.key}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="px-3 py-2 font-medium text-foreground/70">
                            {mod.label}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Checkbox
                              checked={permissions[mod.key].read}
                              onCheckedChange={() =>
                                togglePermission(mod.key, "read")
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Checkbox
                              checked={permissions[mod.key].write}
                              onCheckedChange={() =>
                                togglePermission(mod.key, "write")
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={(v) => setIsDefault(v)}
                />
                <Label htmlFor="isDefault" className="text-sm">
                  Definir como perfil padrão
                </Label>
              </div>

              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingProfile ? "Salvar Alterações" : "Criar Perfil"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
