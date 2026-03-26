import Link from "next/link";
import { getProductionOrders } from "@/actions/production";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye } from "lucide-react";
import type { ProductionStatus } from "@/generated/prisma/client";

const statusLabel: Record<ProductionStatus, string> = {
  PENDING: "Pendente",
  QUEUED: "Na Fila",
  IN_PROGRESS: "Em Produção",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

const statusClassName: Record<ProductionStatus, string> = {
  PENDING: "bg-foreground/[0.04] text-foreground/90 hover:bg-foreground/[0.04]",
  QUEUED: "bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/10",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  PAUSED: "bg-orange-500/10 text-orange-800 hover:bg-orange-500/10",
  COMPLETED: "bg-green-100 text-green-800 hover:bg-green-100",
  CANCELLED: "bg-red-500/10 text-red-800 hover:bg-red-500/10",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function OrdersPage() {
  const orders = await getProductionOrders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Ordens de Produção
          </h2>
          <p className="text-muted-foreground">
            Gerencie as ordens de produção da empresa ativa
          </p>
        </div>
        <Button render={<Link href="/production/orders/new" />}>
          <Plus className="h-4 w-4" />
          Nova Ordem
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Nenhuma ordem de produção cadastrada.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/production/orders/new" />}
          >
            <Plus className="h-4 w-4" />
            Criar primeira ordem
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Prioridade</TableHead>
                <TableHead>Solicitado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell className="font-medium">{order.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusClassName[order.status]}
                    >
                      {statusLabel[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {order.priority}
                  </TableCell>
                  <TableCell>{formatDate(order.requestedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={
                        <Link href={`/production/orders/${order.id}`} />
                      }
                    >
                      <Eye className="h-4 w-4" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
