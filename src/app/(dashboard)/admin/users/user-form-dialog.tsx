"use client"

import { useState, useTransition } from "react"
import { UserPlus, Pencil, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Role } from "@/generated/prisma/client"

interface UserFormDialogProps {
  mode: "create" | "edit"
  user?: {
    id: string
    name: string
    email: string
    role: Role
  }
  createAction: (data: {
    name: string
    email: string
    password: string
    role: Role
  }) => Promise<unknown>
  updateAction: (
    id: string,
    data: {
      name?: string
      email?: string
      password?: string
      role?: Role
    },
  ) => Promise<unknown>
}

const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "MANAGER", label: "Gerente" },
  { value: "SALES", label: "Vendas" },
  { value: "PRODUCTION", label: "Produção" },
  { value: "FINANCE", label: "Financeiro" },
]

export function UserFormDialog({
  mode,
  user,
  createAction,
  updateAction,
}: UserFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const role = formData.get("role") as Role

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createAction({ name, email, password, role })
        } else if (user) {
          const updateData: {
            name?: string
            email?: string
            password?: string
            role?: Role
          } = { name, email, role }
          if (password) updateData.password = password
          await updateAction(user.id, updateData)
        }
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar usuário")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          mode === "create" ? (
            <Button>
              <UserPlus className="h-4 w-4" />
              Novo Usuário
            </Button>
          ) : (
            <Button variant="ghost" size="icon-sm" aria-label="Editar usuário">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo Usuário" : "Editar Usuário"}
          </DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              placeholder="Nome completo"
              defaultValue={user?.name ?? ""}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="email@exemplo.com"
              defaultValue={user?.email ?? ""}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">
              Senha{mode === "edit" ? " (deixe vazio para manter)" : ""}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={mode === "edit" ? "••••••••" : "Mínimo 6 caracteres"}
              required={mode === "create"}
              minLength={6}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Cargo</Label>
            <select
              id="role"
              name="role"
              defaultValue={user?.role ?? "SALES"}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "create" ? "Criar Usuário" : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
