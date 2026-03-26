import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { createPayable } from "@/actions/financial";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewPayablePage() {
  const companyId = await getActiveCompanyId();

  const [contacts, bankAccounts, categories] = await Promise.all([
    prisma.contact.findMany({
      where: { companies: { some: { companyId } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, bankName: true },
      orderBy: { name: "asc" },
    }),
    prisma.financialCategory.findMany({
      where: { companyId, type: "EXPENSE", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  async function handleCreate(formData: FormData) {
    "use server";
    await createPayable(formData);
    redirect("/erp/payables");
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/erp/payables" className="rounded-lg p-2 hover:bg-foreground/[0.04]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Nova conta a pagar</h1>
      </div>

      <form action={handleCreate} className="space-y-6 rounded-xl glass-card p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Número</label>
            <input
              name="number"
              required
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Valor total</label>
            <input
              name="totalValue"
              type="number"
              step="0.01"
              required
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Data de vencimento</label>
            <input
              name="dueDate"
              type="date"
              required
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Data de competência</label>
            <input
              name="competenceDate"
              type="date"
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Fornecedor</label>
            <select
              name="contactId"
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Selecione...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Conta bancária</label>
            <select
              name="bankAccountId"
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Selecione...</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} - {a.bankName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Categoria</label>
            <select
              name="categoryId"
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Selecione...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1">Forma de pagamento</label>
            <select
              name="paymentMethod"
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Selecione...</option>
              <option value="boleto">Boleto</option>
              <option value="pix">PIX</option>
              <option value="transferencia">Transferência</option>
              <option value="cartao_credito">Cartão de crédito</option>
              <option value="cartao_debito">Cartão de débito</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/70 mb-1">Observações</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Link
            href="/erp/payables"
            className="rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
