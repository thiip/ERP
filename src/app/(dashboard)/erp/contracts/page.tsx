import Link from "next/link";
import {
  getContracts,
  updateContractStatus,
  deleteContract,
} from "@/actions/erp";
import { Plus, Trash2 } from "lucide-react";
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
import type { ContractStatus } from "@/generated/prisma/client";
import { redirect } from "next/navigation";

const statusLabel: Record<ContractStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  COMPLETED: "Concluido",
  CANCELLED: "Cancelado",
};

const statusVariant: Record<
  ContractStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
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

export default async function ContractsPage() {
  const contracts = await getContracts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contratos</h2>
          <p className="text-muted-foreground">
            Gerencie os contratos da empresa
          </p>
        </div>
        <Button render={<Link href="/erp/contracts/new" />}>
          <Plus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Nenhum contrato cadastrado.</p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/erp/contracts/new" />}
          >
            <Plus className="h-4 w-4" />
            Criar primeiro contrato
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numero</TableHead>
              <TableHead>Titulo</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="font-medium">
                  {contract.number}
                </TableCell>
                <TableCell>{contract.title}</TableCell>
                <TableCell>{contract.contact?.name ?? "—"}</TableCell>
                <TableCell>
                  {formatCurrency(Number(contract.totalValue))}
                </TableCell>
                <TableCell>{formatDate(contract.startDate)}</TableCell>
                <TableCell>{formatDate(contract.endDate)}</TableCell>
                <TableCell>
                  <form>
                    <Select
                      name="status"
                      defaultValue={contract.status}
                      onValueChange={async (val: string | null) => {
                        "use server";
                        const status = (val ?? "") as ContractStatus;
                        if (status) {
                          await updateContractStatus(contract.id, status);
                          redirect("/erp/contracts");
                        }
                      }}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Rascunho</SelectItem>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                        <SelectItem value="COMPLETED">Concluido</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </form>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {contract.status === "DRAFT" && (
                      <form
                        action={async () => {
                          "use server";
                          await deleteContract(contract.id);
                          redirect("/erp/contracts");
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
