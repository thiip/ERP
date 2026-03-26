import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  Layers,
  BoxIcon,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

export default async function InventoryPage() {
  const activeCompanyId = await getActiveCompanyId();

  const products = await prisma.product.findMany({
    where: { companyId: activeCompanyId },
    select: { type: true, currentStock: true, minimumStock: true },
  });

  const totalProducts = products.length;
  const rawMaterials = products.filter((p) => p.type === "RAW_MATERIAL").length;
  const finishedProducts = products.filter(
    (p) => p.type === "FINISHED_PRODUCT"
  ).length;
  const lowStockAlerts = products.filter(
    (p) => Number(p.currentStock) < Number(p.minimumStock)
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Estoque</h2>
        <p className="text-muted-foreground">
          Gerencie produtos, movimentações e ordens de compra
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Produtos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Produtos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Matérias-Primas
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rawMaterials}</div>
            <p className="text-xs text-muted-foreground">Insumos em estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Produtos Acabados
            </CardTitle>
            <BoxIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finishedProducts}</div>
            <p className="text-xs text-muted-foreground">
              Prontos para venda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Alertas de Estoque Baixo
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Abaixo do mínimo
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Button variant="outline" render={<Link href="/inventory/products" />}>
          Produtos
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" render={<Link href="/inventory/movements" />}>
          Movimentações
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          render={<Link href="/inventory/purchase-orders" />}
        >
          Ordens de Compra
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
