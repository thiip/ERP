import Link from "next/link"
import { ArrowLeft, Building2 } from "lucide-react"
import { getCompanyData } from "@/actions/admin"
import { CompanyForm } from "./company-form"

export default async function CompanyPage() {
  const company = await getCompanyData()

  return (
    <div className="min-h-screen bg-foreground/[0.03]/60 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Administração
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Dados da Empresa
              </h1>
              <p className="mt-0.5 text-sm text-foreground/50">
                Visualize e edite as informações cadastrais da empresa.
              </p>
            </div>
          </div>
        </div>

        <CompanyForm company={company} />
      </div>
    </div>
  )
}
