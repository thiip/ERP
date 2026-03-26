import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  BarChart3,
  ArrowRight,
  FileText,
  Package,
} from "lucide-react";
import type { DealStage } from "@/generated/prisma/client";

const stageLabel: Record<DealStage, string> = {
  CONTACT_CAPTURE: "Contato / Captação",
  BRIEFING: "Briefing",
  PROJECT: "Projetos",
  PRESENTATION: "Apresentação",
  CLOSING: "Fechamento",
  CLOSED_WON: "Ganho",
  CLOSED_LOST: "Perdido",
};

const stageColor: Record<string, string> = {
  CONTACT_CAPTURE: "border-l-emerald-500",
  BRIEFING: "border-l-yellow-500",
  PROJECT: "border-l-teal-500",
  PRESENTATION: "border-l-orange-500",
  CLOSING: "border-l-green-500",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function CrmPage() {
  const activeCompanyId = await getActiveCompanyId();

  const [deals, orgCount, contactCount, proposalCount] = await Promise.all([
    prisma.deal.findMany({
      where: { companyId: activeCompanyId },
      select: { stage: true, value: true },
    }),
    prisma.organization.count({ where: { companyId: activeCompanyId } }),
    prisma.contact.count({
      where: { companies: { some: { companyId: activeCompanyId } } },
    }),
    prisma.proposal.count({ where: { companyId: activeCompanyId } }),
  ]);

  const totalDeals = deals.length;
  const totalPipelineValue = deals.reduce(
    (sum, deal) => sum + Number(deal.value ?? 0),
    0
  );

  const dealsByStage = deals.reduce<Record<string, number>>((acc, deal) => {
    acc[deal.stage] = (acc[deal.stage] || 0) + 1;
    return acc;
  }, {});

  const openDeals = deals.filter(
    (d) => d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST"
  ).length;

  const pipelineStages: DealStage[] = [
    "CONTACT_CAPTURE",
    "BRIEFING",
    "PROJECT",
    "PRESENTATION",
    "CLOSING",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Resumo</h2>
        <p className="text-muted-foreground">
          Visão geral do CRM
        </p>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgCount}</div>
            <p className="text-xs text-muted-foreground">Empresas cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Negócios</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeals}</div>
            <p className="text-xs text-muted-foreground">
              {openDeals} em aberto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor do Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPipelineValue)}
            </div>
            <p className="text-xs text-muted-foreground">Valor total estimado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Propostas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proposalCount}</div>
            <p className="text-xs text-muted-foreground">Propostas geradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline resumido */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Situação dos Projetos</h3>
          <Button variant="outline" size="sm" render={<Link href="/crm/pipeline" />}>
            Ver Pipeline
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {pipelineStages.map((stage) => (
            <div
              key={stage}
              className={`rounded-lg border border-l-4 ${stageColor[stage]} p-3`}
            >
              <p className="text-xs font-medium text-muted-foreground">
                {stageLabel[stage]}
              </p>
              <p className="text-xl font-bold mt-1">
                {dealsByStage[stage] ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                negócio{(dealsByStage[stage] ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Links rápidos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/crm/clients/organizations" className="block">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Clientes</p>
                <p className="text-xs text-muted-foreground">
                  {orgCount} empresas, {contactCount} contatos
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/crm/deals" className="block">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Projetos</p>
                <p className="text-xs text-muted-foreground">
                  {openDeals} em andamento
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/crm/documents" className="block">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Documentos</p>
                <p className="text-xs text-muted-foreground">
                  Propostas e vendas
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventory/products" className="block">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Produtos</p>
                <p className="text-xs text-muted-foreground">
                  Catálogo de decorações
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
