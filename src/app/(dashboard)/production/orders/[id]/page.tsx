import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductionOrder, updateProductionOrderStatus } from "@/actions/production";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Play, Pause, CheckCircle, XCircle, ListOrdered } from "lucide-react";
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

function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDecimal(value: unknown): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductionOrderDetailPage({ params }: PageProps) {
  const { id } = await params;

  let order: Awaited<ReturnType<typeof getProductionOrder>>;
  try {
    order = await getProductionOrder(id);
  } catch {
    notFound();
  }

  async function handleStatusChange(formData: FormData) {
    "use server";
    const orderId = formData.get("id") as string;
    const status = formData.get("status") as ProductionStatus;
    await updateProductionOrderStatus(orderId, status);
  }

  function StatusButton({
    targetStatus,
    label,
    variant = "default",
    icon,
  }: {
    targetStatus: ProductionStatus;
    label: string;
    variant?: "default" | "destructive" | "outline" | "secondary";
    icon: React.ReactNode;
  }) {
    return (
      <form action={handleStatusChange}>
        <input type="hidden" name="id" value={order.id} />
        <input type="hidden" name="status" value={targetStatus} />
        <Button type="submit" variant={variant}>
          {icon}
          {label}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/production/orders" />}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight">
          {order.orderNumber} — {order.title}
        </h2>
        <Badge
          variant="outline"
          className={statusClassName[order.status]}
        >
          {statusLabel[order.status]}
        </Badge>
        <Badge variant="outline" className="bg-teal-500/10 text-teal-800">
          {order.company.name}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {order.status === "PENDING" && (
          <>
            <StatusButton
              targetStatus="QUEUED"
              label="Colocar na Fila"
              variant="default"
              icon={<ListOrdered className="h-4 w-4" />}
            />
            <StatusButton
              targetStatus="CANCELLED"
              label="Cancelar"
              variant="destructive"
              icon={<XCircle className="h-4 w-4" />}
            />
          </>
        )}
        {order.status === "QUEUED" && (
          <>
            <StatusButton
              targetStatus="IN_PROGRESS"
              label="Iniciar Produção"
              variant="default"
              icon={<Play className="h-4 w-4" />}
            />
            <StatusButton
              targetStatus="CANCELLED"
              label="Cancelar"
              variant="destructive"
              icon={<XCircle className="h-4 w-4" />}
            />
          </>
        )}
        {order.status === "IN_PROGRESS" && (
          <>
            <StatusButton
              targetStatus="PAUSED"
              label="Pausar"
              variant="outline"
              icon={<Pause className="h-4 w-4" />}
            />
            <StatusButton
              targetStatus="COMPLETED"
              label="Concluir"
              variant="default"
              icon={<CheckCircle className="h-4 w-4" />}
            />
          </>
        )}
        {order.status === "PAUSED" && (
          <>
            <StatusButton
              targetStatus="IN_PROGRESS"
              label="Retomar"
              variant="default"
              icon={<Play className="h-4 w-4" />}
            />
            <StatusButton
              targetStatus="CANCELLED"
              label="Cancelar"
              variant="destructive"
              icon={<XCircle className="h-4 w-4" />}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="font-medium text-muted-foreground">Número</dt>
              <dd className="font-mono">{order.orderNumber}</dd>

              <dt className="font-medium text-muted-foreground">Título</dt>
              <dd>{order.title}</dd>

              <dt className="font-medium text-muted-foreground">Descrição</dt>
              <dd>{order.description || "—"}</dd>

              <dt className="font-medium text-muted-foreground">Prioridade</dt>
              <dd>{order.priority}</dd>

              <dt className="font-medium text-muted-foreground">Status</dt>
              <dd>
                <Badge
                  variant="outline"
                  className={statusClassName[order.status]}
                >
                  {statusLabel[order.status]}
                </Badge>
              </dd>

              <dt className="font-medium text-muted-foreground">
                Solicitado em
              </dt>
              <dd>{formatDate(order.requestedAt)}</dd>

              <dt className="font-medium text-muted-foreground">
                Iniciado em
              </dt>
              <dd>{formatDate(order.startedAt)}</dd>

              <dt className="font-medium text-muted-foreground">
                Concluído em
              </dt>
              <dd>{formatDate(order.completedAt)}</dd>

              <dt className="font-medium text-muted-foreground">
                Horas Estimadas
              </dt>
              <dd>
                {order.estimatedHours
                  ? formatDecimal(order.estimatedHours)
                  : "—"}
              </dd>

              <dt className="font-medium text-muted-foreground">
                Observações
              </dt>
              <dd>{order.notes || "—"}</dd>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Produtos a Produzir</CardTitle>
            </CardHeader>
            <CardContent>
              {order.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum produto registrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Concluída</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product.name}</TableCell>
                        <TableCell className="text-right">
                          {formatDecimal(item.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatDecimal(item.completedQuantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Materiais Necessários</CardTitle>
            </CardHeader>
            <CardContent>
              {order.materials.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum material registrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Necessário</TableHead>
                      <TableHead className="text-right">Consumido</TableHead>
                      <TableHead className="text-right">
                        Estoque Atual
                      </TableHead>
                      <TableHead className="text-center">Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.materials.map((mat) => {
                      const currentStock = Number(mat.material.currentStock);
                      const required = Number(mat.requiredQuantity);
                      const sufficient = currentStock >= required;

                      return (
                        <TableRow key={mat.id}>
                          <TableCell>{mat.material.name}</TableCell>
                          <TableCell className="text-right">
                            {formatDecimal(mat.requiredQuantity)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatDecimal(mat.consumedQuantity)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatDecimal(currentStock)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                sufficient
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-500/10 text-red-800"
                              }
                            >
                              {sufficient ? "Suficiente" : "Insuficiente"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
