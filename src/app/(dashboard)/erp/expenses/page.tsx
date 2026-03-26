import Link from "next/link";
import { getExpenses, deleteExpense } from "@/actions/erp";
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
import { redirect } from "next/navigation";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

export default async function ExpensesPage() {
  const expenses = await getExpenses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Despesas</h2>
          <p className="text-muted-foreground">
            Gerencie as despesas da empresa
          </p>
        </div>
        <Button render={<Link href="/erp/expenses/new" />}>
          <Plus className="h-4 w-4" />
          Nova Despesa
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Nenhuma despesa cadastrada.</p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/erp/expenses/new" />}
          >
            <Plus className="h-4 w-4" />
            Criar primeira despesa
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Compartilhada</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">
                  {expense.category}
                </TableCell>
                <TableCell>{expense.description}</TableCell>
                <TableCell>
                  {formatCurrency(Number(expense.value))}
                </TableCell>
                <TableCell>{formatDate(expense.date)}</TableCell>
                <TableCell>
                  {expense.isShared ? (
                    <Badge variant="secondary">
                      Compartilhada
                      {expense.splitRatio
                        ? ` (${Number(expense.splitRatio)}%)`
                        : ""}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <form
                    action={async () => {
                      "use server";
                      await deleteExpense(expense.id);
                      redirect("/erp/expenses");
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
