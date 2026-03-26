import Link from "next/link";
import { getInvoices, updateInvoiceStatus, deleteInvoice } from "@/actions/erp";
import { Plus, Eye, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceType, InvoiceStatus } from "@/generated/prisma/client";
import { redirect } from "next/navigation";

const typeLabel: Record<InvoiceType, string> = {
  RECEIVABLE: "A Receber",
  PAYABLE: "A Pagar",
};

const typeVariant: Record<InvoiceType, "default" | "destructive"> = {
  RECEIVABLE: "default",
  PAYABLE: "destructive",
};

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

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Faturas</h2>
          <p className="text-muted-foreground">
            Gerencie as faturas a receber e a pagar
          </p>
        </div>
        <Button render={<Link href="/erp/invoices/new" />}>
          <Plus className="h-4 w-4" />
          Nova Fatura
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Nenhuma fatura cadastrada.</p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/erp/invoices/new" />}
          >
            <Plus className="h-4 w-4" />
            Criar primeira fatura
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numero</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  {invoice.number}
                </TableCell>
                <TableCell>
                  <Badge variant={typeVariant[invoice.type]}>
                    {typeLabel[invoice.type]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {invoice.contact?.name ?? "-"}
                </TableCell>
                <TableCell>
                  {formatCurrency(Number(invoice.totalValue))}
                </TableCell>
                <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                <TableCell>
                  <form>
                    <Select
                      name="status"
                      defaultValue={invoice.status}
                      onValueChange={async (val: string | null) => {
                        "use server";
                        const status = (val ?? "") as InvoiceStatus;
                        if (status) {
                          await updateInvoiceStatus(invoice.id, status);
                          redirect("/erp/invoices");
                        }
                      }}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Rascunho</SelectItem>
                        <SelectItem value="ISSUED">Emitida</SelectItem>
                        <SelectItem value="PAID">Paga</SelectItem>
                        <SelectItem value="OVERDUE">Vencida</SelectItem>
                        <SelectItem value="CANCELLED">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </form>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {invoice.status === "DRAFT" && (
                      <form
                        action={async () => {
                          "use server";
                          await deleteInvoice(invoice.id);
                          redirect("/erp/invoices");
                        }}
                      >
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
