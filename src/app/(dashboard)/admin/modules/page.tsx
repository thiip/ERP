import Link from "next/link"
import {
  ArrowLeft,
  Zap,
  FileText,
  Calculator,
  BarChart3,
  Code,
  Globe,
  Package,
  BookOpen,
  Palette,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react"
import { getSystemModules, seedDefaultModules, toggleSystemModule } from "@/actions/admin"
import { ModuleToggle } from "./module-toggle"

const iconMap: Record<string, LucideIcon> = {
  workflow: Zap,
  proposals: FileText,
  cpq: Calculator,
  analytics: BarChart3,
  api_access: Code,
  external_forms: Globe,
  customer_products: Package,
  library: BookOpen,
  white_label: Palette,
}

export default async function ModulesPage() {
  await seedDefaultModules()
  const modules = await getSystemModules()

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

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Módulos do Sistema
          </h1>
          <p className="mt-1 text-sm text-foreground/50">
            Habilite ou desabilite os módulos disponíveis para sua empresa.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => {
            const Icon = iconMap[mod.key] ?? LayoutGrid
            return (
              <div
                key={mod.id}
                className="flex flex-col justify-between rounded-lg glass-card p-5 transition-shadow hover:shadow-lg"
              >
                <div className="mb-4 flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      mod.isEnabled
                        ? "bg-teal-500/10 text-teal-600"
                        : "bg-foreground/[0.04] text-foreground/40"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      {mod.name}
                    </h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-foreground/50">
                      {mod.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-foreground/[0.04] pt-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      mod.isEnabled
                        ? "bg-green-500/10 text-green-400"
                        : "bg-foreground/[0.04] text-foreground/50"
                    }`}
                  >
                    {mod.isEnabled ? "Habilitado" : "Desabilitado"}
                  </span>

                  <ModuleToggle
                    moduleId={mod.id}
                    isEnabled={mod.isEnabled}
                    moduleName={mod.name}
                    toggleAction={toggleSystemModule}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
