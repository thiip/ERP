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
import { Plus, FileText, Eye } from "lucide-react";
import type { ProposalStatus } from "@/generated/prisma/client";

const statusLabel: Record<ProposalStatus, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviado",
  ACCEPTED: "Aceito",
  REJECTED: "Rejeitado",
};

const statusVariant: Record<
  ProposalStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  SENT: "secondary",
  ACCEPTED: "default",
  REJECTED: "destructive",
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

export default async function QuotesPage() {
  const companyId = await getActiveCompanyId();

  const proposals = await prisma.proposal.findMany({
    where: { companyId },
    include: {
      deal: {
        include: {
          organization: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalCount = proposals.length;
  const totalValue = proposals.reduce(
    (sum, p) => sum + Number(p.totalValue),
    0
  );
  const acceptedValue = proposals
    .filter((p) => p.status === "ACCEPTED")
    .reduce((sum, p) => sum + Number(p.totalValue), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Orcamentos</h2>
          <p className="text-muted-foreground">
            Gerencie propostas e orcamentos enviados aos clientes
          </p>
        </div>
        <Button render={<Link href="/crm/deals/new" />}>
          <Plus className="h-4 w-4" />
          Novo orcamento
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Orcamentos
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              propostas criadas
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
              em propostas enviadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aceitos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(acceptedValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              orcamentos aprovados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Proposals Table */}
      {proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">
            Nenhum orcamento ainda
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie seu primeiro orcamento a partir de uma negociacao no CRM.
          </p>
          <Button
            className="mt-6"
            render={<Link href="/crm/deals/new" />}
          >
            <Plus className="h-4 w-4" />
            Novo orcamento
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Negociacao</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell className="font-medium">
                    {proposal.number}
                  </TableCell>
                  <TableCell>{proposal.deal?.title ?? "-"}</TableCell>
                  <TableCell>
                    {proposal.deal?.organization?.name ?? "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(proposal.totalValue))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[proposal.status]}>
                      {statusLabel[proposal.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(proposal.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={
                        <Link href={`/crm/deals/${proposal.dealId}`} />
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
