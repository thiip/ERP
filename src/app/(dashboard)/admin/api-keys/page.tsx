import Link from "next/link"
import { ArrowLeft, Key } from "lucide-react"
import {
  getApiKeys,
  createApiKey,
  deleteApiKey,
  toggleApiKey,
} from "@/actions/admin"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ApiKeyActions } from "./api-key-actions"
import { ApiKeyCreateDialog } from "./api-key-create-dialog"

export default async function ApiKeysPage() {
  const apiKeys = await getApiKeys()

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
              Chaves de API
            </h1>
            <p className="mt-1 text-sm text-foreground/50">
              Gerencie as chaves de acesso à API do sistema.
            </p>
          </div>

          <ApiKeyCreateDialog createAction={createApiKey} />
        </div>

        <div className="rounded-lg glass-card">
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
                <Key className="h-6 w-6 text-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground">
                Nenhuma chave de API
              </h3>
              <p className="mt-1 text-sm text-foreground/50">
                Crie uma chave de API para integrar com outros sistemas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Chave</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-600">
                          <Key className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-foreground">
                          {apiKey.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ApiKeyMasked apiKey={apiKey.key} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            apiKey.isActive ? "bg-green-500/100" : "bg-red-500/100"
                          }`}
                        />
                        <span className="text-sm text-foreground/60">
                          {apiKey.isActive ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground/50">
                      {apiKey.lastUsedAt
                        ? new Date(apiKey.lastUsedAt).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-sm text-foreground/50">
                      {new Date(apiKey.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <ApiKeyActions
                        apiKey={JSON.parse(JSON.stringify(apiKey))}
                        toggleAction={toggleApiKey}
                        deleteAction={deleteApiKey}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}

function ApiKeyMasked({ apiKey }: { apiKey: string }) {
  const masked =
    apiKey.length > 8
      ? apiKey.slice(0, 4) + "••••••••" + apiKey.slice(-4)
      : "••••••••"

  return (
    <code className="rounded bg-foreground/[0.04] px-2 py-1 text-xs font-mono text-foreground/60">
      {masked}
    </code>
  )
}
