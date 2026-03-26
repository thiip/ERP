"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getBankAccounts,
  createBankAccount,
  deleteBankAccount,
} from "@/actions/financial";
import { Plus, Pencil, Trash2, Upload, RefreshCw } from "lucide-react";

type BankAccount = {
  id: string;
  name: string;
  bankName: string;
  bankCode: string | null;
  agencyNumber: string | null;
  accountNumber: string | null;
  accountType: string;
  balance: unknown;
  isActive: boolean;
  autoReconcile: boolean;
  lastSyncAt: Date | null;
  _count?: { reconciliations: number };
};

const accountTypeLabels: Record<string, string> = {
  CHECKING: "Corrente",
  SAVINGS: "Poupança",
  INVESTMENT: "Investimento",
  CASH: "Caixa",
  DIGITAL: "Digital",
};

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    const data = await getBankAccounts();
    setAccounts(data as unknown as BankAccount[]);
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createBankAccount(formData);
      setShowForm(false);
      loadAccounts();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;
    startTransition(async () => {
      await deleteBankAccount(id);
      loadAccounts();
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova conta financeira
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03] transition-colors">
          <RefreshCw className="h-4 w-4" />
          Automatizar conciliação
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl glass-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Nova conta financeira</h3>
          <form action={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                Nome da conta
              </label>
              <input
                name="name"
                required
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                Banco
              </label>
              <input
                name="bankName"
                required
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                Código do banco
              </label>
              <input
                name="bankCode"
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                Agência
              </label>
              <input
                name="agencyNumber"
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                Número da conta
              </label>
              <input
                name="accountNumber"
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                Tipo de conta
              </label>
              <select
                name="accountType"
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="CHECKING">Corrente</option>
                <option value="SAVINGS">Poupança</option>
                <option value="INVESTMENT">Investimento</option>
                <option value="CASH">Caixa</option>
                <option value="DIGITAL">Digital</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1">
                Saldo inicial
              </label>
              <input
                name="balance"
                type="number"
                step="0.01"
                defaultValue="0"
                className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">
                Banco
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">
                Nome da conta
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">
                Tipo de conta
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">
                Saldo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">
                Conciliações
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-foreground/50">
                  Nenhuma conta financeira cadastrada.
                </td>
              </tr>
            )}
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-foreground/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                      {account.bankName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{account.bankName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{account.name}</div>
                    {account.autoReconcile && (
                      <span className="text-xs text-green-600">Automação ativa</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-foreground/60">
                  {accountTypeLabels[account.accountType] || account.accountType}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(Number(account.balance))}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                    {(account._count?.reconciliations ?? 0)} pendências
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button className="text-sm text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                      <Upload className="h-3.5 w-3.5" />
                      Importar
                    </button>
                    <button className="rounded p-1 text-foreground/40 hover:text-foreground/60 hover:bg-foreground/[0.04]">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="rounded p-1 text-foreground/40 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
