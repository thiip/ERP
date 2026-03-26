import { createExpense } from "@/actions/erp";
import { redirect } from "next/navigation";
import { ExpenseForm } from "@/components/erp/expense-form";

export default function NewExpensePage() {
  async function handleCreate(formData: FormData) {
    "use server";
    await createExpense(formData);
    redirect("/erp/expenses");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nova Despesa</h2>
        <p className="text-muted-foreground">
          Preencha os dados para cadastrar uma nova despesa
        </p>
      </div>
      <ExpenseForm action={handleCreate} />
    </div>
  );
}
