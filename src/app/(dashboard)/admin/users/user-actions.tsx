"use client"

import { useTransition } from "react"
import { Power, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserFormDialog } from "./user-form-dialog"
import type { Role } from "@/generated/prisma/client"

interface UserActionsProps {
  user: {
    id: string
    name: string
    email: string
    role: Role
    isActive: boolean
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
  toggleActiveAction: (id: string, isActive: boolean) => Promise<unknown>
}

export function UserActions({
  user,
  createAction,
  updateAction,
  toggleActiveAction,
}: UserActionsProps) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await toggleActiveAction(user.id, !user.isActive)
    })
  }

  return (
    <div className="flex items-center gap-1">
      <UserFormDialog
        mode="edit"
        user={user}
        createAction={createAction}
        updateAction={updateAction}
      />

      <form action={handleToggle}>
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          aria-label={user.isActive ? "Desativar usuário" : "Ativar usuário"}
          className={
            user.isActive
              ? "text-red-500 hover:text-red-400 hover:bg-red-500/10"
              : "text-green-500 hover:text-green-400 hover:bg-green-500/10"
          }
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Power className="h-3.5 w-3.5" />
          )}
        </Button>
      </form>
    </div>
  )
}
