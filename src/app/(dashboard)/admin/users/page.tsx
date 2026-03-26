import Link from "next/link"
import { ArrowLeft, Shield, Users } from "lucide-react"
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserActive,
} from "@/actions/admin"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserFormDialog } from "./user-form-dialog"
import { UserActions } from "./user-actions"

const ROLE_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  ADMIN: {
    label: "Admin",
    className: "bg-teal-500/10 text-teal-400",
  },
  MANAGER: {
    label: "Gerente",
    className: "bg-emerald-500/10 text-emerald-400",
  },
  SALES: {
    label: "Vendas",
    className: "bg-green-100 text-green-400",
  },
  PRODUCTION: {
    label: "Produção",
    className: "bg-orange-500/10 text-orange-400",
  },
  FINANCE: {
    label: "Financeiro",
    className: "bg-yellow-500/10 text-yellow-400",
  },
}

export default async function UsersPage() {
  const users = await getUsers()

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
              Tabela de Usuários
            </h1>
            <p className="mt-1 text-sm text-foreground/50">
              Gerencie os usuários com acesso ao sistema.
            </p>
          </div>

          <UserFormDialog
            mode="create"
            createAction={createUser}
            updateAction={updateUser}
          />
        </div>

        <div className="rounded-lg glass-card">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.04]">
                <Users className="h-6 w-6 text-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground">
                Nenhum usuário encontrado
              </h3>
              <p className="mt-1 text-sm text-foreground/50">
                Comece criando o primeiro usuário do sistema.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const roleBadge = ROLE_BADGE[user.role] ?? {
                    label: user.role,
                    className: "bg-foreground/[0.04] text-foreground/70",
                  }

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-600">
                            <Shield className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-foreground">
                            {user.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground/50">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge.className}`}
                        >
                          {roleBadge.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              user.isActive ? "bg-green-500/100" : "bg-red-500/100"
                            }`}
                          />
                          <span className="text-sm text-foreground/60">
                            {user.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <UserActions
                          user={user}
                          createAction={createUser}
                          updateAction={updateUser}
                          toggleActiveAction={toggleUserActive}
                        />
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
