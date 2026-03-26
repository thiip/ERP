"use client"

import { useState, useTransition } from "react"
import { Copy, Power, Trash2, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

interface ApiKeyActionsProps {
  apiKey: {
    id: string
    key: string
    isActive: boolean
  }
  toggleAction: (id: string, isActive: boolean) => Promise<unknown>
  deleteAction: (id: string) => Promise<unknown>
}

export function ApiKeyActions({
  apiKey,
  toggleAction,
  deleteAction,
}: ApiKeyActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(apiKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleAction(apiKey.id, !apiKey.isActive)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteAction(apiKey.id)
      setDeleteOpen(false)
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        aria-label="Copiar chave"
        className="text-foreground/50 hover:text-foreground/70"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleToggle}
        disabled={isPending}
        aria-label={apiKey.isActive ? "Desativar chave" : "Ativar chave"}
        className={
          apiKey.isActive
            ? "text-red-500 hover:bg-red-500/10 hover:text-red-400"
            : "text-green-500 hover:bg-green-500/10 hover:text-green-400"
        }
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Power className="h-3.5 w-3.5" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setDeleteOpen(true)}
        disabled={isPending}
        aria-label="Excluir chave"
        className="text-red-500 hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/50">
            Tem certeza que deseja excluir esta chave de API? Todos os sistemas
            que a utilizam perderão o acesso imediatamente.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
