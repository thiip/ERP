import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId, getSessionUser } from "@/lib/company-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Package,
  Factory,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Building2,
  ArrowUpRight,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

const stageLabels: Record<string, string> = {
  CONTACT_CAPTURE: "Captacao",
  BRIEFING: "Briefing",
  PROJECT: "Projetos",
  PRESENTATION: "Apresentacao",
  CLOSING: "Fechamento",
  CLOSED_WON: "Ganho",
  CLOSED_LOST: "Perdido",
};

const stageBarColors: Record<string, string> = {
  CONTACT_CAPTURE: "bg-emerald-400",
  BRIEFING: "bg-yellow-400",
  PROJECT: "bg-teal-400",
  PRESENTATION: "bg-orange-400",
  CLOSING: "bg-emerald-400",
};

const dealCardColors = [
  "bg-gradient-to-br from-emerald-500/80 to-emerald-600/80 text-white",
  "bg-gradient-to-br from-yellow-400/80 to-yellow-500/80 text-foreground",
  "bg-gradient-to-br from-teal-400/80 to-teal-600/80 text-white",
  "bg-gradient-to-br from-gray-700/80 to-gray-800/80 text-white",
  "bg-gradient-to-br from-violet-500/80 to-teal-600/80 text-white",
];

const productionStatusLabels: Record<string, string> = {
  PENDING: "Pendente",
  QUEUED: "Na Fila",
  IN_PROGRESS: "Em Producao",
  PAUSED: "Pausado",
  COMPLETED: "Concluido",
  CANCELLED: "Cancelado",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  const companyId = await getActiveCompanyId();

  const [
    activeDeals,
    wonDeals,
    totalOrganizations,
    totalContacts,
    totalProducts,
    lowStockProducts,
    activeProductionOrders,
    pendingInvoices,
    unresolvedAlerts,
    recentDeals,
    upcomingFollowUps,
    recentProductionOrders,
  ] = await Promise.all([
    prisma.deal.count({
      where: {
        companyId,
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
      },
    }),
    prisma.deal.aggregate({
      where: { companyId, stage: "CLOSED_WON" },
      _sum: { value: true },
      _count: true,
    }),
    prisma.organization.count({ where: { companyId } }),
    prisma.contact.count({
      where: { companies: { some: { companyId } } },
    }),
    prisma.product.count({
      where: { companyId, isActive: true },
    }),
    prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint as count FROM "Product" WHERE "companyId" = $1 AND "isActive" = true AND "currentStock" <= "minimumStock" AND "minimumStock" > 0`,
      companyId
    ),
    prisma.productionOrder.count({
      where: {
        companyId,
        status: { in: ["PENDING", "QUEUED", "IN_PROGRESS"] },
      },
    }),
    prisma.invoice.aggregate({
      where: {
        companyId,
        type: "RECEIVABLE",
        status: { in: ["DRAFT", "ISSUED", "OVERDUE"] },
      },
      _sum: { totalValue: true },
      _count: true,
    }),
    prisma.materialAlert.count({
      where: { companyId, isResolved: false },
    }),
    prisma.deal.findMany({
      where: { companyId },
      include: {
        organization: { select: { name: true } },
        contact: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.followUp.findMany({
      where: {
        deal: { companyId },
        completedAt: null,
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        deal: {
          include: {
            organization: { select: { name: true } },
            contact: { select: { name: true } },
          },
        },
        user: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.productionOrder.findMany({
      where: {
        companyId,
        status: { in: ["PENDING", "QUEUED", "IN_PROGRESS"] },
      },
      orderBy: { priority: "desc" },
      take: 5,
    }),
  ]);

  const lowStockCount = Number(lowStockProducts[0]?.count ?? 0);
  const wonValue = Number(wonDeals._sum.value ?? 0);
  const pendingValue = Number(pendingInvoices._sum.totalValue ?? 0);
  const pendingCount = pendingInvoices._count;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Visao Geral
          </h1>
          <p className="text-sm text-foreground/40 mt-0.5">
            Bem-vindo, {user.name?.split(" ")[0]}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg border-foreground/10 text-foreground/60 hover:text-foreground hover:bg-foreground/[0.04]"
            render={<Link href="/crm/clients/organizations/new" />}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Empresa
          </Button>
          <Button
            size="sm"
            className="rounded-lg bg-foreground/10 text-white hover:bg-foreground/15 border-0"
            render={<Link href="/crm/deals/new" />}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo Negocio
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{formatCurrency(wonValue)}</p>
              <p className="text-xs text-foreground/40">
                Ganho de {wonDeals._count} Negocios
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/100/10">
              <Users className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{totalOrganizations}</p>
              <p className="text-xs text-foreground/40">Clientes Ativos</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Package className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{activeDeals}</p>
              <p className="text-xs text-foreground/40">Negocios Ativos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {(lowStockCount > 0 || unresolvedAlerts > 0) && (
        <div className="flex items-center gap-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/100/5 px-5 py-3">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-medium text-yellow-300">Atencao: </span>
            <span className="text-yellow-200/70">
              {lowStockCount > 0 && `${lowStockCount} produto(s) com estoque baixo. `}
              {unresolvedAlerts > 0 && `${unresolvedAlerts} alerta(s) de material.`}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 rounded-lg border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/100/10"
            render={<Link href="/production/alerts" />}
          >
            Ver alertas
          </Button>
        </div>
      )}

      {/* Recent deals - colored cards */}
      <div className="glass-card rounded-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-foreground">Negocios Recentes</h2>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg text-xs text-foreground/40 hover:text-foreground/70"
            render={<Link href="/crm/deals" />}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="px-5 pb-5">
          {recentDeals.length === 0 ? (
            <p className="text-sm text-foreground/30 text-center py-6">
              Nenhum negocio cadastrado
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentDeals.map((deal, i) => (
                <Link
                  key={deal.id}
                  href={`/crm/deals/${deal.id}`}
                  className={`relative rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-lg ${
                    dealCardColors[i % dealCardColors.length]
                  }`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-[11px] opacity-60">
                        {deal.createdAt
                          ? new Date(deal.createdAt).toLocaleDateString("pt-BR", {
                              day: "numeric",
                              month: "short",
                            })
                          : ""}
                      </p>
                      <p className="text-sm font-semibold leading-tight mt-0.5">
                        {deal.title}
                      </p>
                    </div>
                    <button className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/20 hover:bg-card/30 transition-colors">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-lg font-bold">
                      {deal.value ? formatCurrency(Number(deal.value)) : "-"}
                    </p>
                    <div className="flex -space-x-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-card/30 ring-2 ring-white/20 text-[10px] font-medium">
                        {deal.organization?.name?.charAt(0) ?? deal.contact?.name?.charAt(0) ?? "?"}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Follow-ups */}
        <div className="glass-card rounded-2xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Proximos Follow-ups</h2>
              <p className="text-xs text-foreground/30 mt-0.5">Agendados para os proximos 7 dias</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg text-xs text-foreground/40 hover:text-foreground/70"
              render={<Link href="/crm/deals" />}
            >
              Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="px-5 pb-5">
            {upcomingFollowUps.length === 0 ? (
              <p className="text-sm text-foreground/30 text-center py-6">
                Nenhum follow-up agendado
              </p>
            ) : (
              <div className="space-y-1">
                {upcomingFollowUps.map((fu) => (
                  <Link
                    key={fu.id}
                    href={`/crm/deals/${fu.deal.id}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-foreground/[0.03] transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground/80 truncate group-hover:text-foreground transition-colors">
                        {fu.deal.title}
                      </p>
                      <p className="text-xs text-foreground/30">
                        {fu.description ?? fu.type} - {fu.deal.organization?.name ?? fu.deal.contact?.name ?? ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <CalendarClock className="h-3.5 w-3.5 text-foreground/25" />
                      <span className="text-xs text-foreground/30 whitespace-nowrap">
                        {fu.scheduledAt
                          ? new Date(fu.scheduledAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "-"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Production Queue */}
        <div className="glass-card rounded-2xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Fila de Producao</h2>
              <p className="text-xs text-foreground/30 mt-0.5">{activeProductionOrders} ordem(ns) ativa(s)</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg text-xs text-foreground/40 hover:text-foreground/70"
              render={<Link href="/production/queue" />}
            >
              Ver fila <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="px-5 pb-5">
            {recentProductionOrders.length === 0 ? (
              <p className="text-sm text-foreground/30 text-center py-6">
                Nenhuma ordem ativa
              </p>
            ) : (
              <div className="space-y-1">
                {recentProductionOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/production/orders/${order.id}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-foreground/[0.03] transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground/80 truncate group-hover:text-foreground transition-colors">
                        {order.title}
                      </p>
                      <p className="text-xs text-foreground/30">
                        #{order.orderNumber} - Prioridade {order.priority}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-3 text-[10px] shrink-0 rounded-full border-foreground/10 text-foreground/50">
                      {productionStatusLabels[order.status] ?? order.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pipeline */}
        <div className="glass-card rounded-2xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-sm font-semibold text-foreground">Pipeline de Vendas</h2>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg text-xs text-foreground/40 hover:text-foreground/70"
              render={<Link href="/crm/pipeline" />}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="px-5 pb-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-foreground">{formatCurrency(wonValue + pendingValue)}</p>
                <p className="text-xs text-foreground/30">Total no Pipeline</p>
              </div>
              <div className="space-y-2.5">
                {Object.entries(stageLabels)
                  .filter(([key]) => !["CLOSED_WON", "CLOSED_LOST"].includes(key))
                  .map(([key, label]) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-foreground/40 w-24 shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-foreground/[0.04] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${stageBarColors[key] ?? "bg-emerald-400"}`}
                          style={{ width: `${Math.max(8, Math.random() * 80)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card rounded-2xl">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-sm font-semibold text-foreground">Acoes Rapidas</h2>
            <p className="text-xs text-foreground/30 mt-0.5">Acesse os modulos do sistema</p>
          </div>
          <div className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-1.5 rounded-xl border-foreground/[0.06] hover:border-foreground/10 hover:bg-foreground/[0.03] transition-all text-foreground/60 hover:text-foreground/80"
                render={<Link href="/crm/pipeline" />}
              >
                <ClipboardList className="h-5 w-5" />
                <span className="text-xs font-medium">Pipeline</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-1.5 rounded-xl border-foreground/[0.06] hover:border-foreground/10 hover:bg-foreground/[0.03] transition-all text-foreground/60 hover:text-foreground/80"
                render={<Link href="/crm/clients/organizations" />}
              >
                <Building2 className="h-5 w-5" />
                <span className="text-xs font-medium">Clientes</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-1.5 rounded-xl border-foreground/[0.06] hover:border-foreground/10 hover:bg-foreground/[0.03] transition-all text-foreground/60 hover:text-foreground/80"
                render={<Link href="/production/orders" />}
              >
                <Factory className="h-5 w-5" />
                <span className="text-xs font-medium">Producao</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-1.5 rounded-xl border-foreground/[0.06] hover:border-foreground/10 hover:bg-foreground/[0.03] transition-all text-foreground/60 hover:text-foreground/80"
                render={<Link href="/erp/invoices" />}
              >
                <DollarSign className="h-5 w-5" />
                <span className="text-xs font-medium">Faturas</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
