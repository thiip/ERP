import Link from "next/link"
import {
  LayoutGrid,
  FormInput,
  ListChecks,
  Building2,
  SlidersHorizontal,
  Zap,
  ListOrdered,
  Users,
  UsersRound,
  Shield,
  ScrollText,
  FileText,
  CheckCircle,
  Plug,
  Key,
  Webhook,
  type LucideIcon,
} from "lucide-react"

interface AdminCard {
  title: string
  href: string
  icon: LucideIcon
}

interface AdminCategory {
  name: string
  cards: AdminCard[]
}

const categories: AdminCategory[] = [
  {
    name: "Geral",
    cards: [
      { title: "Módulos do Sistema", href: "/admin/modules", icon: LayoutGrid },
      { title: "Campos e Formulários", href: "/admin/fields", icon: FormInput },
      { title: "Opções Pré-cadastradas", href: "/admin/options", icon: ListChecks },
      { title: "Dados da Empresa", href: "/admin/company", icon: Building2 },
      { title: "Configurações do Sistema", href: "/admin/settings", icon: SlidersHorizontal },
      { title: "Automações", href: "/admin/automations", icon: Zap },
      { title: "Fila de Processamento", href: "/admin/queue", icon: ListOrdered },
    ],
  },
  {
    name: "Usuários",
    cards: [
      { title: "Tabela de Usuários", href: "/admin/users", icon: Users },
      { title: "Equipes de Usuários", href: "/admin/teams", icon: UsersRound },
      { title: "Perfis de Usuário", href: "/admin/profiles", icon: Shield },
      { title: "Registros (Audit Log)", href: "/admin/audit-log", icon: ScrollText },
    ],
  },
  {
    name: "Propostas e Vendas",
    cards: [
      { title: "Modelos de Documento", href: "/admin/templates", icon: FileText },
      { title: "Fluxos de Aprovação", href: "/admin/approval-flows", icon: CheckCircle },
    ],
  },
  {
    name: "Integrações",
    cards: [
      { title: "Integrações", href: "/admin/integrations", icon: Plug },
      { title: "Chaves de API", href: "/admin/api-keys", icon: Key },
      { title: "Webhooks", href: "/admin/webhooks", icon: Webhook },
    ],
  },
]

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-foreground/[0.03]/60 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-2xl font-bold tracking-tight text-foreground">
          Administração
        </h1>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <div key={category.name}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground/50">
                {category.name}
              </h2>
              <div className="flex flex-col gap-2">
                {category.cards.map((card) => {
                  const Icon = card.icon
                  return (
                    <Link
                      key={card.href}
                      href={card.href}
                      className="group flex items-center gap-3 rounded-lg glass-card px-4 py-3 transition-all duration-150 hover:border-teal-500/20 hover:shadow-lg"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-500/10 text-teal-600 transition-colors group-hover:bg-teal-500/10">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium text-foreground/70 group-hover:text-foreground">
                        {card.title}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
