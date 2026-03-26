import Link from "next/link";
import { getUnifiedQueue } from "@/actions/production";
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
import { Eye } from "lucide-react";
import type { ProductionStatus } from "@/generated/prisma/client";

const statusLabel: Record<ProductionStatus, string> = {
  PENDING: "Pendente",
  QUEUED: "Na Fila",
  IN_PROGRESS: "Em Produção",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

const statusVariant: Record<
  ProductionStatus,
  "secondary" | "default" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  QUEUED: "default",
  IN_PROGRESS: "default",
  PAUSED: "outline",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

const statusClassName: Record<ProductionStatus, string> = {
  PENDING: "bg-foreground/[0.04] text-foreground/90 hover:bg-foreground/[0.04]",
  QUEUED: "bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/10",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  PAUSED: "bg-orange-500/10 text-orange-800 hover:bg-orange-500/10",
  COMPLETED: "bg-green-100 text-green-800 hover:bg-green-100",
  CANCELLED: "bg-red-500/10 text-red-800 hover:bg-red-500/10",
};

const companyColors = [
  "bg-teal-500/10 text-teal-800",
  "bg-teal-100 text-teal-800",
  "bg-pink-100 text-pink-800",
  "bg-green-500/10 text-green-800",
  "bg-emerald-500/10 text-emerald-800",
  "bg-yellow-500/10 text-yellow-800",
  "bg-teal-100 text-teal-800",
  "bg-red-500/10 text-rose-800",
];

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function QueuePage() {
  const orders = await getUnifiedQueue();

  const companyColorMap = new Map<string, string>();
  let colorIndex = 0;

  for (const order of orders) {
    if (!companyColorMap.has(order.companyId)) {
      companyColorMap.set(
        order.companyId,
        companyColors[colorIndex % companyColors.length]
      );
      colorIndex++;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Fila de Produção (Unificada)
        </h2>
        <p className="text-muted-foreground">
          Visão consolidada de todas as ordens de produção de todas as empresas
          em ordem cronológica
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Nenhuma ordem de produção ativa na fila.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Empresa</TableHead>
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
                      className={
                        companyColorMap.get(order.companyId) ?? companyColors[0]
                      }
                    >
                      {order.company.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant[order.status]}
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
