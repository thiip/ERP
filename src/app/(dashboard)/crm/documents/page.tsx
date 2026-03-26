import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  ACCEPTED: "Aceita",
  REJECTED: "Rejeitada",
};

const statusColor: Record<string, string> = {
  DRAFT: "bg-foreground/[0.04] text-foreground/70",
  SENT: "bg-emerald-500/10 text-emerald-400",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-500/10 text-red-400",
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

export default async function DocumentsPage() {
  const companyId = await getActiveCompanyId();

  const proposals = await prisma.proposal.findMany({
    where: { companyId },
    include: {
      deal: { select: { title: true } },
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const openProposals = proposals.filter(
    (p) => p.status === "DRAFT" || p.status === "SENT"
  );
  const wonProposals = proposals.filter((p) => p.status === "ACCEPTED");
  const lostProposals = proposals.filter((p) => p.status === "REJECTED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documentos</h2>
          <p className="text-muted-foreground">
            Propostas, vendas e documentos
          </p>
        </div>
      </div>

      <Tabs defaultValue="propostas">
        <TabsList>
          <TabsTrigger value="propostas" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Propostas
          </TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="propostas" className="pt-4">
          <Tabs defaultValue="aberto">
            <TabsList>
              <TabsTrigger value="aberto">
                Propostas em aberto ({openProposals.length})
              </TabsTrigger>
              <TabsTrigger value="perdidas">
                Propostas perdidas ({lostProposals.length})
              </TabsTrigger>
              <TabsTrigger value="ganhas">
                Propostas ganhas ({wonProposals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="aberto" className="pt-4">
              <ProposalTable proposals={openProposals} />
            </TabsContent>
            <TabsContent value="perdidas" className="pt-4">
              <ProposalTable proposals={lostProposals} />
            </TabsContent>
            <TabsContent value="ganhas" className="pt-4">
              <ProposalTable proposals={wonProposals} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="vendas" className="pt-4">
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma venda registrada ainda.
          </p>
        </TabsContent>

        <TabsContent value="documentos" className="pt-4">
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum documento registrado ainda.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProposalTable({
  proposals,
}: {
  proposals: {
    id: string;
    number: string;
    revision: number;
    totalValue: any;
    status: string;
    createdAt: Date;
    deal: { title: string } | null;
    organization: { name: string } | null;
  }[];
}) {
  if (proposals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhuma proposta nesta categoria.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Código
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Nº Revisão
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Cliente de Projeto
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Valor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Data
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {proposals.map((p) => (
            <tr key={p.id} className="border-b hover:bg-muted/30">
              <td className="px-4 py-3 text-sm font-medium">{p.number}</td>
              <td className="px-4 py-3 text-sm">{p.revision}</td>
              <td className="px-4 py-3 text-sm">
                {p.organization?.name ?? p.deal?.title ?? "—"}
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {formatCurrency(Number(p.totalValue))}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDate(p.createdAt)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusColor[p.status] ?? ""
                  }`}
                >
                  {statusLabel[p.status] ?? p.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
