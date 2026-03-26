import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, FileText, ShoppingCart, Eye } from "lucide-react";
import type { InvoiceStatus } from "@/generated/prisma/client";

const statusLabel: Record<InvoiceStatus, string> = {
  DRAFT: "Rascunho",
  ISSUED: "Emitida",
  PAID: "Paga",
  OVERDUE: "Vencida",
  CANCELLED: "Cancelada",
};

const statusVariant: Record<
  InvoiceStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  ISSUED: "secondary",
  PAID: "default",
  OVERDUE: "destructive",
  CANCELLED: "outline",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

export default async function SalesPage() {
  const companyId = await getActiveCompanyId();

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      type: "RECEIVABLE",
    },
    include: {
      organization: true,
      contact: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalCount = invoices.length;
  const totalValue = invoices.reduce(
    (sum, inv) => sum + Number(inv.totalValue),
    0
  );
  const paidValue = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + Number(inv.totalValue), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vendas</h2>
          <p className="text-muted-foreground">
            Acompanhe suas vendas, faturas e pagamentos recebidos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/crm/deals/new" />}>
            <FileText className="h-4 w-4" />
            Criar orcamento
          </Button>
          <Button render={<Link href="/erp/invoices/new" />}>
            <ShoppingCart className="h-4 w-4" />
            Nova venda de produto
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Vendas
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              faturas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              em vendas realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(paidValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              pagamentos confirmados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Nenhuma venda ainda</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Comece registrando sua primeira venda ou criando um orcamento para um
            cliente.
          </p>
          <div className="mt-6 flex items-center gap-2">
            <Button
              variant="outline"
              render={<Link href="/crm/deals/new" />}
            >
              <FileText className="h-4 w-4" />
              Criar orcamento
            </Button>
            <Button render={<Link href="/erp/invoices/new" />}>
              <Plus className="h-4 w-4" />
              Nova venda de produto
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-sm">
                    {formatDate(invoice.dueDate)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {invoice.organization?.name ??
                      invoice.contact?.name ??
                      "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(invoice.totalValue))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[invoice.status]}>
                      {statusLabel[invoice.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={
                        <Link href={`/erp/invoices/${invoice.id}`} />
                      }
                    >
                      <Eye className="h-4 w-4" />
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
