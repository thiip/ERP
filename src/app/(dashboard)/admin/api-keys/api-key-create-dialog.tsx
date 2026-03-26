"use client"

import { useState, useTransition } from "react"
import { Plus, Loader2 } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"

const PERMISSIONS = [
  { key: "crm:read", label: "CRM - Leitura" },
  { key: "crm:write", label: "CRM - Escrita" },
  { key: "erp:read", label: "ERP - Leitura" },
  { key: "erp:write", label: "ERP - Escrita" },
  { key: "inventory:read", label: "Estoque - Leitura" },
  { key: "inventory:write", label: "Estoque - Escrita" },
  { key: "production:read", label: "Produção - Leitura" },
  { key: "production:write", label: "Produção - Escrita" },
  { key: "webhooks:manage", label: "Webhooks - Gerenciar" },
  { key: "admin:read", label: "Admin - Leitura" },
]

interface ApiKeyCreateDialogProps {
  createAction: (data: {
    name: string
    permissions: string
    expiresAt?: string
  }) => Promise<unknown>
}

export function ApiKeyCreateDialog({ createAction }: ApiKeyCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [expiresAt, setExpiresAt] = useState("")

  function togglePermission(key: string) {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    )
  }

  function handleCreate() {
    if (!name.trim() || selectedPermissions.length === 0) return

    startTransition(async () => {
      await createAction({
        name: name.trim(),
        permissions: JSON.stringify(selectedPermissions),
        expiresAt: expiresAt || undefined,
      })
      setOpen(false)
      setName("")
      setSelectedPermissions([])
      setExpiresAt("")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-1.5 h-4 w-4" />
        Nova Chave
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Chave de API</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="key-name">Nome</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Integração Shopify"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="key-expires">Expira em (opcional)</Label>
            <Input
              id="key-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Permissões</Label>
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-foreground/[0.08] p-3 sm:grid-cols-2">
              {PERMISSIONS.map((perm) => (
                <label
                  key={perm.key}
                  className="flex cursor-pointer items-center gap-2 text-sm text-foreground/70"
                >
                  <Checkbox
                    checked={selectedPermissions.includes(perm.key)}
                    onCheckedChange={() => togglePermission(perm.key)}
                  />
                  {perm.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button
            onClick={handleCreate}
            disabled={
              isPending || !name.trim() || selectedPermissions.length === 0
            }
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Chave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
