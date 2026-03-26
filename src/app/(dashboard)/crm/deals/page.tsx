import Link from "next/link";
import { getDeals } from "@/actions/crm";
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
import type { DealStage } from "@/generated/prisma/client";

const stageLabel: Record<DealStage, string> = {
  CONTACT_CAPTURE: "Contato / Captação",
  BRIEFING: "Briefing",
  PROJECT: "Projetos",
  PRESENTATION: "Apresentação",
  CLOSING: "Fechamento",
  CLOSED_WON: "Ganho",
  CLOSED_LOST: "Perdido",
};

const stageVariant: Record<DealStage, "default" | "secondary" | "outline" | "destructive"> = {
  CONTACT_CAPTURE: "outline",
  BRIEFING: "secondary",
  PROJECT: "secondary",
  PRESENTATION: "secondary",
  CLOSING: "default",
  CLOSED_WON: "default",
  CLOSED_LOST: "destructive",
};

function formatCurrency(value: unknown): string {
  const num = Number(value);
  if (!value || isNaN(num)) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

export default async function DealsPage() {
  const deals = await getDeals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Negócios</h2>
          <p className="text-muted-foreground">
            Gerencie os negócios e projetos do CRM
          </p>
        </div>
        <Button render={<Link href="/crm/deals/new" />}>
          <Plus className="h-4 w-4" />
          Novo negócio
        </Button>
      </div>

      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Nenhum negócio cadastrado.</p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/crm/deals/new" />}
          >
            <Plus className="h-4 w-4" />
            Criar primeiro negócio
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell className="font-medium">{deal.title}</TableCell>
                <TableCell>{deal.organization?.name ?? "-"}</TableCell>
                <TableCell>{deal.contact?.name ?? "-"}</TableCell>
                <TableCell>{formatCurrency(deal.value)}</TableCell>
                <TableCell>
                  <Badge variant={stageVariant[deal.stage]}>
                    {stageLabel[deal.stage]}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(deal.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/crm/deals/${deal.id}`} />}
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
