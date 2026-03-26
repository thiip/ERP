import Link from "next/link";
import { getPurchaseOrders } from "@/actions/inventory";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PurchaseOrderStatus } from "@/generated/prisma/client";

const statusLabel: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  PARTIAL: "Parcial",
  RECEIVED: "Recebida",
  CANCELLED: "Cancelada",
};

const statusVariant: Record<
  PurchaseOrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  SENT: "default",
  PARTIAL: "secondary",
  RECEIVED: "default",
  CANCELLED: "destructive",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export default async function PurchaseOrdersPage() {
  const orders = await getPurchaseOrders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Ordens de Compra
          </h2>
          <p className="text-muted-foreground">
            Gerencie as ordens de compra de materiais
          </p>
        </div>
        <Button render={<Link href="/inventory/purchase-orders/new" />}>
          <Plus className="h-4 w-4" />
          Nova Ordem
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Nenhuma ordem de compra cadastrada.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/inventory/purchase-orders/new" />}
          >
            <Plus className="h-4 w-4" />
            Criar primeira ordem
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Itens</TableHead>
              <TableHead>Dt. Entrega</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  {order.supplierName}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(Number(order.totalValue ?? 0))}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[order.status]}>
                    {statusLabel[order.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {order._count.items}
                </TableCell>
                <TableCell>
                  {order.expectedDelivery
                    ? formatDate(new Date(order.expectedDelivery))
                    : "-"}
                </TableCell>
                <TableCell>{formatDate(order.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={
                      <Link
                        href={`/inventory/purchase-orders/${order.id}`}
                      />
                    }
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
