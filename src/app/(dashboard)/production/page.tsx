import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Play,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

export default async function ProductionPage() {
  const companyId = await getActiveCompanyId();

  const orders = await prisma.productionOrder.findMany({
    where: { companyId },
    select: { status: true },
  });

  const unresolvedAlerts = await prisma.materialAlert.count({
    where: { companyId, isResolved: false },
  });

  const totalOrders = orders.length;
  const inProduction = orders.filter(
    (o) => o.status === "IN_PROGRESS"
  ).length;
  const inQueue = orders.filter(
    (o) => o.status === "QUEUED" || o.status === "PENDING"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Produção</h2>
        <p className="text-muted-foreground">
          Gerencie ordens de produção, fila unificada e alertas de material
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Ordens</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Ordens de produção registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Produção</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProduction}</div>
            <p className="text-xs text-muted-foreground">
              Ordens em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Na Fila</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inQueue}</div>
            <p className="text-xs text-muted-foreground">
              Pendentes e aguardando
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Alertas de Material
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unresolvedAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Alertas não resolvidos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button
          variant="outline"
          render={<Link href="/production/queue" />}
        >
          Fila de Produção
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          render={<Link href="/production/orders" />}
        >
          Minhas Ordens
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button render={<Link href="/production/orders/new" />}>
          Nova Ordem
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          render={<Link href="/production/alerts" />}
        >
          Alertas
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
