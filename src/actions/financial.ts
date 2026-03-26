"use server";

import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { revalidatePath } from "next/cache";
import type {
  BankAccountType,
  TransactionStatus,
  BoletoStatus,
  TransferStatus,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function monthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

/** Convert Prisma Decimal fields to plain numbers so data can be serialized to client components */
function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      // Prisma Decimal has a toNumber() method
      if (value !== null && typeof value === "object" && typeof value.toNumber === "function") {
        return value.toNumber();
      }
      return value;
    })
  );
}

function parseBRLValue(raw: string): number {
  // Accepts "1.234,56" or "1234.56"
  if (raw.includes(",")) {
    return parseFloat(raw.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(raw);
}

// ---------------------------------------------------------------------------
// 1. Bank Accounts (CRUD)
// ---------------------------------------------------------------------------

export async function getBankAccounts() {
  const companyId = await getActiveCompanyId();

  const accounts = await prisma.bankAccount.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
  return serialize(accounts);
}

export async function getBankAccount(id: string) {
  const companyId = await getActiveCompanyId();

  const account = await prisma.bankAccount.findFirst({
    where: { id, companyId },
    include: {
      transactions: { orderBy: { date: "desc" }, take: 50 },
    },
  });

  if (!account) {
    throw new Error("Conta bancária não encontrada");
  }

  return serialize(account);
}

export async function createBankAccount(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const name = formData.get("name") as string;
  const bankName = formData.get("bankName") as string;
  const bankCode = (formData.get("bankCode") as string) || null;
  const agencyNumber = (formData.get("agencyNumber") as string) || null;
  const accountNumber = (formData.get("accountNumber") as string) || null;
  const accountType = (formData.get("accountType") as BankAccountType) || "CHECKING";
  const balanceStr = (formData.get("balance") as string) || "0";

  if (!name) throw new Error("Nome é obrigatório");
  if (!bankName) throw new Error("Nome do banco é obrigatório");

  const account = await prisma.bankAccount.create({
    data: {
      companyId,
      name,
      bankName,
      bankCode,
      agencyNumber,
      accountNumber,
      accountType,
      balance: parseBRLValue(balanceStr),
    },
  });

  revalidatePath("/erp");
  return serialize(account);
}

export async function updateBankAccount(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.bankAccount.findFirst({
    where: { id, companyId },
  });
  if (!existing) throw new Error("Conta bancária não encontrada");

  const name = formData.get("name") as string;
  const bankName = formData.get("bankName") as string;
  const bankCode = (formData.get("bankCode") as string) || null;
  const agencyNumber = (formData.get("agencyNumber") as string) || null;
  const accountNumber = (formData.get("accountNumber") as string) || null;
  const accountType = (formData.get("accountType") as BankAccountType) || existing.accountType;
  const balanceStr = formData.get("balance") as string | null;

  const account = await prisma.bankAccount.update({
    where: { id },
    data: {
      name: name || existing.name,
      bankName: bankName || existing.bankName,
      bankCode,
      agencyNumber,
      accountNumber,
      accountType,
      ...(balanceStr ? { balance: parseBRLValue(balanceStr) } : {}),
    },
  });

  revalidatePath("/erp");
  return serialize(account);
}

export async function deleteBankAccount(id: string) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.bankAccount.findFirst({
    where: { id, companyId },
    include: { transactions: { take: 1 } },
  });
  if (!existing) throw new Error("Conta bancária não encontrada");
  if (existing.transactions.length > 0) {
    throw new Error("Não é possível excluir conta com transações vinculadas");
  }

  await prisma.bankAccount.delete({ where: { id } });

  revalidatePath("/erp");
}

// ---------------------------------------------------------------------------
// 2. Bank Transactions
// ---------------------------------------------------------------------------

export async function getBankTransactions(
  bankAccountId: string,
  month: number,
  year: number
) {
  const companyId = await getActiveCompanyId();
  const { start, end } = monthRange(month, year);

  // Verify ownership
  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, companyId },
  });
  if (!account) throw new Error("Conta bancária não encontrada");

  const transactions = await prisma.bankTransaction.findMany({
    where: {
      bankAccountId,
      date: { gte: start, lt: end },
    },
    include: {
      category: true,
      costCenter: true,
      reconciliation: true,
    },
    orderBy: { date: "desc" },
  });
  return serialize(transactions);
}

export async function getTransactionsSummary(
  bankAccountId: string,
  month: number,
  year: number
) {
  const companyId = await getActiveCompanyId();
  const { start, end } = monthRange(month, year);

  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, companyId },
  });
  if (!account) throw new Error("Conta bancária não encontrada");

  const transactions = await prisma.bankTransaction.findMany({
    where: {
      bankAccountId,
      date: { gte: start, lt: end },
    },
  });

  let payments = 0;
  let receipts = 0;
  let unreconciled = 0;

  for (const t of transactions) {
    const val = Number(t.value);
    if (t.type === "CREDIT") {
      receipts += val;
    } else {
      payments += Math.abs(val);
    }
    if (t.status === "PENDING") {
      unreconciled++;
    }
  }

  return {
    payments,
    receipts,
    unreconciled,
    balance: Number(account.balance),
  };
}

export async function importBankStatement(
  bankAccountId: string,
  formData: FormData
) {
  const companyId = await getActiveCompanyId();

  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, companyId },
  });
  if (!account) throw new Error("Conta bancária não encontrada");

  const csvData = formData.get("csvData") as string;
  if (!csvData) throw new Error("Dados CSV são obrigatórios");

  const lines = csvData
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Skip header if present
  const startIdx = lines[0]?.toLowerCase().includes("date") ||
    lines[0]?.toLowerCase().includes("data")
    ? 1
    : 0;

  const created: string[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(";").length > 1
      ? lines[i].split(";")
      : lines[i].split(",");

    if (parts.length < 3) continue;

    const [dateStr, description, valueStr] = parts.map((p) => p.trim().replace(/"/g, ""));

    const value = parseBRLValue(valueStr);
    if (isNaN(value)) continue;

    const dateParts = dateStr.includes("/")
      ? dateStr.split("/")
      : dateStr.split("-");

    let date: Date;
    if (dateParts[0].length === 4) {
      // YYYY-MM-DD
      date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    } else {
      // DD/MM/YYYY
      date = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
    }

    if (isNaN(date.getTime())) continue;

    const transaction = await prisma.bankTransaction.create({
      data: {
        bankAccountId,
        date,
        description,
        value: Math.abs(value),
        type: value >= 0 ? "CREDIT" : "DEBIT",
        status: "PENDING",
      },
    });

    created.push(transaction.id);
  }

  revalidatePath("/erp");
  return { imported: created.length };
}

// ---------------------------------------------------------------------------
// 3. Financial Transfers
// ---------------------------------------------------------------------------

export async function getTransfers(month: number, year: number) {
  const companyId = await getActiveCompanyId();
  const { start, end } = monthRange(month, year);

  const transfers = await prisma.financialTransfer.findMany({
    where: {
      companyId,
      date: { gte: start, lt: end },
    },
    include: {
      fromAccount: true,
      toAccount: true,
    },
    orderBy: { date: "desc" },
  });
  return serialize(transfers);
}

export async function createTransfer(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const fromAccountId = formData.get("fromAccountId") as string;
  const toAccountId = formData.get("toAccountId") as string;
  const valueStr = formData.get("value") as string;
  const dateStr = formData.get("date") as string;
  const description = (formData.get("description") as string) || null;

  if (!fromAccountId) throw new Error("Conta de origem é obrigatória");
  if (!toAccountId) throw new Error("Conta de destino é obrigatória");
  if (!valueStr) throw new Error("Valor é obrigatório");
  if (!dateStr) throw new Error("Data é obrigatória");
  if (fromAccountId === toAccountId) {
    throw new Error("Conta de origem e destino devem ser diferentes");
  }

  // Verify both accounts belong to company
  const [fromAccount, toAccount] = await Promise.all([
    prisma.bankAccount.findFirst({ where: { id: fromAccountId, companyId } }),
    prisma.bankAccount.findFirst({ where: { id: toAccountId, companyId } }),
  ]);
  if (!fromAccount) throw new Error("Conta de origem não encontrada");
  if (!toAccount) throw new Error("Conta de destino não encontrada");

  const value = parseBRLValue(valueStr);

  const transfer = await prisma.financialTransfer.create({
    data: {
      companyId,
      fromAccountId,
      toAccountId,
      value,
      date: new Date(dateStr),
      description,
      status: "PENDING",
    },
  });

  revalidatePath("/erp");
  return serialize(transfer);
}

export async function completeTransfer(id: string) {
  const companyId = await getActiveCompanyId();

  const transfer = await prisma.financialTransfer.findFirst({
    where: { id, companyId },
  });
  if (!transfer) throw new Error("Transferência não encontrada");
  if (transfer.status !== "PENDING") {
    throw new Error("Somente transferências pendentes podem ser concluídas");
  }

  const value = Number(transfer.value);

  await prisma.$transaction([
    prisma.financialTransfer.update({
      where: { id },
      data: { status: "COMPLETED" },
    }),
    prisma.bankAccount.update({
      where: { id: transfer.fromAccountId },
      data: { balance: { decrement: value } },
    }),
    prisma.bankAccount.update({
      where: { id: transfer.toAccountId },
      data: { balance: { increment: value } },
    }),
  ]);

  revalidatePath("/erp");
}

export async function cancelTransfer(id: string) {
  const companyId = await getActiveCompanyId();

  const transfer = await prisma.financialTransfer.findFirst({
    where: { id, companyId },
  });
  if (!transfer) throw new Error("Transferência não encontrada");
  if (transfer.status !== "PENDING") {
    throw new Error("Somente transferências pendentes podem ser canceladas");
  }

  await prisma.financialTransfer.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/erp");
}

// ---------------------------------------------------------------------------
// 4. Contas a Pagar (Payables)
// ---------------------------------------------------------------------------

export async function getPayables(
  month?: number,
  year?: number,
  status?: InvoiceStatusFilter,
  accountId?: string
) {
  const companyId = await getActiveCompanyId();

  const where: Record<string, unknown> = {
    companyId,
    type: "PAYABLE" as const,
  };

  if (month && year) {
    const { start, end } = monthRange(month, year);
    where.dueDate = { gte: start, lt: end };
  }

  if (status) {
    where.status = status;
  }

  if (accountId) {
    where.bankAccountId = accountId;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      contact: true,
      organization: true,
      bankAccount: true,
      financialCategory: true,
      costCenter: true,
    },
    orderBy: { dueDate: "asc" },
  });
  return serialize(invoices);
}

type InvoiceStatusFilter = "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "CANCELLED";

export async function getPayablesSummary(month: number, year: number) {
  const companyId = await getActiveCompanyId();
  const { start, end } = monthRange(month, year);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      type: "PAYABLE",
      dueDate: { gte: start, lt: end },
    },
    select: {
      totalValue: true,
      paidValue: true,
      status: true,
      dueDate: true,
    },
  });

  let vencidos = 0;
  let vencemHoje = 0;
  let aVencer = 0;
  let pagos = 0;
  let total = 0;

  for (const inv of invoices) {
    const val = Number(inv.totalValue);
    total += val;

    if (inv.status === "PAID") {
      pagos += Number(inv.paidValue ?? inv.totalValue);
      continue;
    }

    const due = new Date(inv.dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today) {
      vencidos += val;
    } else if (due.getTime() === today.getTime()) {
      vencemHoje += val;
    } else {
      aVencer += val;
    }
  }

  return { vencidos, vencemHoje, aVencer, pagos, total };
}

export async function markAsPaid(
  id: string,
  paidValue?: number,
  bankAccountId?: string
) {
  const companyId = await getActiveCompanyId();

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId, type: "PAYABLE" },
  });
  if (!invoice) throw new Error("Conta a pagar não encontrada");
  if (invoice.status === "PAID") throw new Error("Fatura já está paga");

  const finalValue = paidValue ?? Number(invoice.totalValue);

  await prisma.invoice.update({
    where: { id },
    data: {
      status: "PAID",
      paidValue: finalValue,
      paidAt: new Date(),
      bankAccountId: bankAccountId || invoice.bankAccountId,
    },
  });

  // Deduct from bank account if specified
  if (bankAccountId) {
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { balance: { decrement: finalValue } },
    });
  }

  revalidatePath("/erp");
}

export async function batchMarkAsPaid(ids: string[]) {
  const companyId = await getActiveCompanyId();

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: ids }, companyId, type: "PAYABLE", status: { not: "PAID" } },
  });

  if (invoices.length === 0) throw new Error("Nenhuma fatura pendente encontrada");

  await prisma.invoice.updateMany({
    where: { id: { in: invoices.map((i) => i.id) } },
    data: {
      status: "PAID",
      paidAt: new Date(),
    },
  });

  revalidatePath("/erp");
  return { updated: invoices.length };
}

export async function batchDelete(ids: string[]) {
  const companyId = await getActiveCompanyId();

  const invoices = await prisma.invoice.findMany({
    where: { id: { in: ids }, companyId, status: "DRAFT" },
  });

  if (invoices.length === 0) {
    throw new Error("Nenhuma fatura em rascunho encontrada para exclusão");
  }

  await prisma.invoice.deleteMany({
    where: { id: { in: invoices.map((i) => i.id) } },
  });

  revalidatePath("/erp");
  return { deleted: invoices.length };
}

// ---------------------------------------------------------------------------
// 5. Contas a Receber (Receivables)
// ---------------------------------------------------------------------------

export async function getReceivables(
  month?: number,
  year?: number,
  status?: InvoiceStatusFilter,
  accountId?: string
) {
  const companyId = await getActiveCompanyId();

  const where: Record<string, unknown> = {
    companyId,
    type: "RECEIVABLE" as const,
  };

  if (month && year) {
    const { start, end } = monthRange(month, year);
    where.dueDate = { gte: start, lt: end };
  }

  if (status) {
    where.status = status;
  }

  if (accountId) {
    where.bankAccountId = accountId;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      contact: true,
      organization: true,
      bankAccount: true,
      financialCategory: true,
      costCenter: true,
    },
    orderBy: { dueDate: "asc" },
  });
  return serialize(invoices);
}

export async function getReceivablesSummary(month: number, year: number) {
  const companyId = await getActiveCompanyId();
  const { start, end } = monthRange(month, year);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      type: "RECEIVABLE",
      dueDate: { gte: start, lt: end },
    },
    select: {
      totalValue: true,
      paidValue: true,
      status: true,
      dueDate: true,
    },
  });

  let vencidos = 0;
  let vencemHoje = 0;
  let aVencer = 0;
  let recebidos = 0;
  let total = 0;

  for (const inv of invoices) {
    const val = Number(inv.totalValue);
    total += val;

    if (inv.status === "PAID") {
      recebidos += Number(inv.paidValue ?? inv.totalValue);
      continue;
    }

    const due = new Date(inv.dueDate);
    due.setHours(0, 0, 0, 0);

    if (due < today) {
      vencidos += val;
    } else if (due.getTime() === today.getTime()) {
      vencemHoje += val;
    } else {
      aVencer += val;
    }
  }

  return { vencidos, vencemHoje, aVencer, recebidos, total };
}

export async function markAsReceived(
  id: string,
  paidValue?: number,
  bankAccountId?: string
) {
  const companyId = await getActiveCompanyId();

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId, type: "RECEIVABLE" },
  });
  if (!invoice) throw new Error("Conta a receber não encontrada");
  if (invoice.status === "PAID") throw new Error("Fatura já foi recebida");

  const finalValue = paidValue ?? Number(invoice.totalValue);

  await prisma.invoice.update({
    where: { id },
    data: {
      status: "PAID",
      paidValue: finalValue,
      paidAt: new Date(),
      bankAccountId: bankAccountId || invoice.bankAccountId,
    },
  });

  // Credit to bank account if specified
  if (bankAccountId) {
    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { balance: { increment: finalValue } },
    });
  }

  revalidatePath("/erp");
}

export async function renegotiateReceivable(
  id: string,
  newDueDate: string,
  newValue?: number
) {
  const companyId = await getActiveCompanyId();

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId, type: "RECEIVABLE" },
  });
  if (!invoice) throw new Error("Conta a receber não encontrada");
  if (invoice.status === "PAID") throw new Error("Fatura já foi recebida");

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      dueDate: new Date(newDueDate),
      ...(newValue !== undefined ? { totalValue: newValue } : {}),
      status: "ISSUED",
      notes: `${invoice.notes || ""}\n[Renegociada em ${new Date().toLocaleDateString("pt-BR")}]`.trim(),
    },
  });

  revalidatePath("/erp");
  return updated;
}

// ---------------------------------------------------------------------------
// 6. DDA Boletos
// ---------------------------------------------------------------------------

export async function getDDABoletos(
  month?: number,
  year?: number,
  status?: BoletoStatus
) {
  const companyId = await getActiveCompanyId();

  const where: Record<string, unknown> = {
    companyId,
  };

  if (month && year) {
    const { start, end } = monthRange(month, year);
    where.dueDate = { gte: start, lt: end };
  }

  if (status) {
    where.status = status;
  } else {
    // By default, hide hidden boletos
    where.status = { not: "HIDDEN" };
  }

  const boletos = await prisma.dDABoleto.findMany({
    where,
    orderBy: { dueDate: "asc" },
  });
  return serialize(boletos);
}

export async function getDDASummary(month: number, year: number) {
  const companyId = await getActiveCompanyId();
  const { start, end } = monthRange(month, year);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const boletos = await prisma.dDABoleto.findMany({
    where: {
      companyId,
      dueDate: { gte: start, lt: end },
      status: { not: "HIDDEN" },
    },
    select: {
      value: true,
      dueDate: true,
      status: true,
    },
  });

  let aVencer = 0;
  let vencidos = 0;
  let totalCount = boletos.length;

  for (const b of boletos) {
    const val = Number(b.value);
    const due = new Date(b.dueDate);
    due.setHours(0, 0, 0, 0);

    if (b.status === "PAID" || b.status === "LINKED") continue;

    if (due < today) {
      vencidos += val;
    } else {
      aVencer += val;
    }
  }

  return { aVencer, vencidos, totalCount };
}

export async function linkBoletoToExpense(boletoId: string, expenseId: string) {
  const companyId = await getActiveCompanyId();

  const boleto = await prisma.dDABoleto.findFirst({
    where: { id: boletoId, companyId },
  });
  if (!boleto) throw new Error("Boleto não encontrado");

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, companyId },
  });
  if (!expense) throw new Error("Despesa não encontrada");

  await prisma.dDABoleto.update({
    where: { id: boletoId },
    data: {
      status: "LINKED",
      invoiceId: expenseId, // reusing invoiceId field for linking
    },
  });

  revalidatePath("/erp");
}

export async function hideBoleto(id: string) {
  const companyId = await getActiveCompanyId();

  const boleto = await prisma.dDABoleto.findFirst({
    where: { id, companyId },
  });
  if (!boleto) throw new Error("Boleto não encontrado");

  await prisma.dDABoleto.update({
    where: { id },
    data: { status: "HIDDEN" },
  });

  revalidatePath("/erp");
}

export async function unhideBoleto(id: string) {
  const companyId = await getActiveCompanyId();

  const boleto = await prisma.dDABoleto.findFirst({
    where: { id, companyId },
  });
  if (!boleto) throw new Error("Boleto não encontrado");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(boleto.dueDate);
  due.setHours(0, 0, 0, 0);

  await prisma.dDABoleto.update({
    where: { id },
    data: { status: due < today ? "OVERDUE" : "PENDING" },
  });

  revalidatePath("/erp");
}

export async function registerExpenseFromBoleto(boletoId: string) {
  const companyId = await getActiveCompanyId();

  const boleto = await prisma.dDABoleto.findFirst({
    where: { id: boletoId, companyId },
  });
  if (!boleto) throw new Error("Boleto não encontrado");

  const expense = await prisma.expense.create({
    data: {
      companyId,
      category: "Boleto DDA",
      description: `${boleto.supplierName} - ${boleto.digitableLine || boleto.barcode || ""}`.trim(),
      value: Number(boleto.value),
      date: boleto.dueDate,
      supplierName: boleto.supplierName,
      supplierCnpj: boleto.supplierCnpj,
      isPaid: false,
    },
  });

  await prisma.dDABoleto.update({
    where: { id: boletoId },
    data: {
      status: "LINKED",
      invoiceId: expense.id,
    },
  });

  revalidatePath("/erp");
  return serialize(expense);
}

export async function syncDDABoletos() {
  const companyId = await getActiveCompanyId();

  // Try to use Itaú integration if configured
  try {
    const { getItauDDAConfig, performDDASync } = await import("@/lib/itau-dda");
    const config = await getItauDDAConfig(companyId);

    if (config) {
      const result = await performDDASync(companyId, config.credentials);
      revalidatePath("/erp");
      return result;
    }
  } catch (error) {
    console.error("[DDA Sync] Itaú integration error:", error);
  }

  // Fallback: update overdue statuses
  await prisma.dDABoleto.updateMany({
    where: {
      companyId,
      status: "PENDING",
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });

  revalidatePath("/erp");
  return {
    success: false,
    message: "Integração Itaú DDA não configurada. Configure em Administração > Integrações.",
  };
}

// ---------------------------------------------------------------------------
// 7. Inadimplentes (Defaulters)
// ---------------------------------------------------------------------------

type DefaulterTab = "atrasadas" | "em_andamento" | "resolvidas";

export async function getDefaulters(tab: DefaulterTab = "atrasadas") {
  const companyId = await getActiveCompanyId();
  const today = new Date();

  let statusFilter: Record<string, unknown>;

  switch (tab) {
    case "atrasadas":
      statusFilter = {
        status: { in: ["ISSUED", "OVERDUE"] },
        dueDate: { lt: today },
      };
      break;
    case "em_andamento":
      // Renegotiated: notes contain "[Renegociada"
      statusFilter = {
        status: { in: ["ISSUED", "OVERDUE"] },
        notes: { contains: "[Renegociada" },
      };
      break;
    case "resolvidas":
      statusFilter = {
        status: "PAID",
        dueDate: { lt: today },
      };
      break;
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      type: "RECEIVABLE",
      ...statusFilter,
    },
    include: {
      contact: true,
      organization: true,
    },
    orderBy: { dueDate: "asc" },
  });

  // Group by contact/organization
  const grouped = new Map<
    string,
    {
      clientName: string;
      clientId: string;
      clientType: "contact" | "organization";
      invoices: typeof invoices;
      totalOverdue: number;
    }
  >();

  for (const inv of invoices) {
    const key = inv.organizationId || inv.contactId || "sem_cliente";
    const clientName =
      inv.organization?.name || inv.contact?.name || "Sem cliente";
    const clientType = inv.organizationId ? "organization" : "contact";

    if (!grouped.has(key)) {
      grouped.set(key, {
        clientName,
        clientId: key,
        clientType,
        invoices: [],
        totalOverdue: 0,
      });
    }

    const group = grouped.get(key)!;
    group.invoices.push(inv);
    group.totalOverdue += Number(inv.totalValue);
  }

  return serialize(
    Array.from(grouped.values()).sort(
      (a, b) => b.totalOverdue - a.totalOverdue
    )
  );
}

export async function configureCharges(settings: {
  autoReminder?: boolean;
  reminderDaysBefore?: number;
  reminderDaysAfter?: number[];
  emailTemplate?: string;
}) {
  const companyId = await getActiveCompanyId();

  // Placeholder: store settings in CompanySetting
  await prisma.companySetting.upsert({
    where: {
      companyId_key: { companyId, key: "charge_settings" },
    },
    update: {
      value: JSON.stringify(settings),
    },
    create: {
      companyId,
      key: "charge_settings",
      value: JSON.stringify(settings),
    },
  });

  revalidatePath("/erp");
  return { success: true };
}

export async function renegotiateDefault(
  invoiceId: string,
  newDueDate: string,
  newValue?: number
) {
  // Delegates to renegotiateReceivable
  return renegotiateReceivable(invoiceId, newDueDate, newValue);
}

// ---------------------------------------------------------------------------
// 8. Extrato de Movimentações (Transaction Statement)
// ---------------------------------------------------------------------------

export async function getTransactionStatement(
  month: number,
  year: number,
  accountId?: string
) {
  const companyId = await getActiveCompanyId();
  const { start, end } = monthRange(month, year);

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        dueDate: { gte: start, lt: end },
        ...(accountId ? { bankAccountId: accountId } : {}),
      },
      include: { contact: true, organization: true, bankAccount: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: start, lt: end },
        ...(accountId ? { bankAccountId: accountId } : {}),
      },
      include: { bankAccount: true },
      orderBy: { date: "asc" },
    }),
  ]);

  type StatementEntry = {
    id: string;
    date: Date;
    description: string;
    value: number;
    type: "RECEIVABLE" | "PAYABLE" | "EXPENSE";
    status: string;
    clientName: string | null;
    bankAccountName: string | null;
    category: string | null;
  };

  const entries: StatementEntry[] = [];

  for (const inv of invoices) {
    entries.push({
      id: inv.id,
      date: inv.dueDate,
      description: inv.notes || inv.number,
      value: Number(inv.totalValue),
      type: inv.type as "RECEIVABLE" | "PAYABLE",
      status: inv.status,
      clientName: inv.organization?.name || inv.contact?.name || null,
      bankAccountName: inv.bankAccount?.name || null,
      category: inv.category,
    });
  }

  for (const exp of expenses) {
    entries.push({
      id: exp.id,
      date: exp.date,
      description: exp.description,
      value: Number(exp.value),
      type: "EXPENSE",
      status: exp.isPaid ? "PAID" : "PENDING",
      clientName: exp.supplierName || null,
      bankAccountName: exp.bankAccount?.name || null,
      category: exp.category,
    });
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime());

  return entries;
}

export async function getStatementSummary(month: number, year: number) {
  const companyId = await getActiveCompanyId();
  const { start, end } = monthRange(month, year);

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        dueDate: { gte: start, lt: end },
      },
      select: { type: true, totalValue: true, paidValue: true, status: true },
    }),
    prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: start, lt: end },
      },
      select: { value: true, paidValue: true, isPaid: true },
    }),
  ]);

  let receitasEmAberto = 0;
  let receitasRealizadas = 0;
  let despesasEmAberto = 0;
  let despesasRealizadas = 0;

  for (const inv of invoices) {
    const val = Number(inv.totalValue);
    if (inv.type === "RECEIVABLE") {
      if (inv.status === "PAID") {
        receitasRealizadas += Number(inv.paidValue ?? inv.totalValue);
      } else if (inv.status !== "CANCELLED") {
        receitasEmAberto += val;
      }
    } else {
      if (inv.status === "PAID") {
        despesasRealizadas += Number(inv.paidValue ?? inv.totalValue);
      } else if (inv.status !== "CANCELLED") {
        despesasEmAberto += val;
      }
    }
  }

  for (const exp of expenses) {
    const val = Number(exp.value);
    if (exp.isPaid) {
      despesasRealizadas += Number(exp.paidValue ?? exp.value);
    } else {
      despesasEmAberto += val;
    }
  }

  const total = (receitasRealizadas + receitasEmAberto) - (despesasRealizadas + despesasEmAberto);

  return {
    receitasEmAberto,
    receitasRealizadas,
    despesasEmAberto,
    despesasRealizadas,
    total,
  };
}

// ---------------------------------------------------------------------------
// 9. Fluxo de Caixa (Cash Flow)
// ---------------------------------------------------------------------------

export async function getCashFlow(month: number, year: number) {
  const companyId = await getActiveCompanyId();
  const { start, end } = monthRange(month, year);

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        dueDate: { gte: start, lt: end },
        status: { not: "CANCELLED" },
      },
      select: {
        type: true,
        totalValue: true,
        paidValue: true,
        status: true,
        dueDate: true,
        paidAt: true,
        number: true,
        notes: true,
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: start, lt: end },
      },
      select: {
        value: true,
        paidValue: true,
        date: true,
        description: true,
        isPaid: true,
      },
      orderBy: { date: "asc" },
    }),
  ]);

  // Build daily breakdown
  const daysInMonth = new Date(year, month, 0).getDate();
  const daily: {
    day: number;
    date: string;
    receipts: number;
    payments: number;
    balance: number;
  }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    daily.push({
      day: d,
      date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      receipts: 0,
      payments: 0,
      balance: 0,
    });
  }

  for (const inv of invoices) {
    const effectiveDate = inv.status === "PAID" && inv.paidAt ? inv.paidAt : inv.dueDate;
    const dayIdx = new Date(effectiveDate).getDate() - 1;
    if (dayIdx < 0 || dayIdx >= daysInMonth) continue;

    const val = Number(inv.paidValue ?? inv.totalValue);

    if (inv.type === "RECEIVABLE") {
      daily[dayIdx].receipts += val;
    } else {
      daily[dayIdx].payments += val;
    }
  }

  for (const exp of expenses) {
    const dayIdx = new Date(exp.date).getDate() - 1;
    if (dayIdx < 0 || dayIdx >= daysInMonth) continue;

    daily[dayIdx].payments += Number(exp.paidValue ?? exp.value);
  }

  // Calculate running balance
  let runningBalance = 0;
  for (const day of daily) {
    runningBalance += day.receipts - day.payments;
    day.balance = runningBalance;
  }

  return daily;
}

export async function getCashFlowChart(month: number, year: number) {
  const daily = await getCashFlow(month, year);

  return {
    labels: daily.map((d) => String(d.day)),
    receipts: daily.map((d) => d.receipts),
    payments: daily.map((d) => d.payments),
    balance: daily.map((d) => d.balance),
  };
}

// ---------------------------------------------------------------------------
// 10. Histórico (Financial History)
// ---------------------------------------------------------------------------

export async function getFinancialHistory(days: number = 90) {
  const companyId = await getActiveCompanyId();
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.financialHistory.findMany({
    where: {
      companyId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function logFinancialAction(
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  const companyId = await getActiveCompanyId();

  const entry = await prisma.financialHistory.create({
    data: {
      companyId,
      action,
      entityType,
      entityId,
      description,
      metadata: metadata ? (metadata as Record<string, string>) : undefined,
    },
  });

  return entry;
}

// ---------------------------------------------------------------------------
// 11. Financial Categories (CRUD)
// ---------------------------------------------------------------------------

type CategoryType = "REVENUE" | "EXPENSE";

export async function getCategories(type?: CategoryType) {
  const companyId = await getActiveCompanyId();

  return prisma.financialCategory.findMany({
    where: {
      companyId,
      ...(type ? { type } : {}),
    },
    include: { children: true },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const parentId = (formData.get("parentId") as string) || null;
  const color = (formData.get("color") as string) || null;

  if (!name) throw new Error("Nome é obrigatório");
  if (!type || !["REVENUE", "EXPENSE"].includes(type)) {
    throw new Error("Tipo deve ser REVENUE ou EXPENSE");
  }

  const category = await prisma.financialCategory.create({
    data: {
      companyId,
      name,
      type,
      parentId: parentId || undefined,
      color,
    },
  });

  revalidatePath("/erp");
  return category;
}

export async function updateCategory(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.financialCategory.findFirst({
    where: { id, companyId },
  });
  if (!existing) throw new Error("Categoria não encontrada");

  const name = (formData.get("name") as string) || existing.name;
  const type = (formData.get("type") as string) || existing.type;
  const parentId = formData.get("parentId") as string | null;
  const color = formData.get("color") as string | null;

  const category = await prisma.financialCategory.update({
    where: { id },
    data: {
      name,
      type,
      parentId: parentId || existing.parentId,
      color: color ?? existing.color,
    },
  });

  revalidatePath("/erp");
  return category;
}

export async function deleteCategory(id: string) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.financialCategory.findFirst({
    where: { id, companyId },
    include: { children: { take: 1 }, invoices: { take: 1 }, expenses: { take: 1 } },
  });
  if (!existing) throw new Error("Categoria não encontrada");
  if (existing.children.length > 0) {
    throw new Error("Não é possível excluir categoria com subcategorias");
  }
  if (existing.invoices.length > 0 || existing.expenses.length > 0) {
    throw new Error("Não é possível excluir categoria vinculada a faturas ou despesas");
  }

  await prisma.financialCategory.delete({ where: { id } });

  revalidatePath("/erp");
}

export async function seedDefaultCategories() {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.financialCategory.count({
    where: { companyId },
  });
  if (existing > 0) {
    return { created: 0, message: "Categorias já existem" };
  }

  const defaults: { name: string; type: string; color: string }[] = [
    // Revenue
    { name: "Vendas de Projetos", type: "REVENUE", color: "#22c55e" },
    { name: "Serviços de Instalação", type: "REVENUE", color: "#16a34a" },
    { name: "Locação de Produtos", type: "REVENUE", color: "#15803d" },
    { name: "Consultoria", type: "REVENUE", color: "#14532d" },
    { name: "Outras Receitas", type: "REVENUE", color: "#86efac" },
    // Expense
    { name: "Material de Decoração", type: "EXPENSE", color: "#ef4444" },
    { name: "Mão de Obra", type: "EXPENSE", color: "#dc2626" },
    { name: "Transporte / Frete", type: "EXPENSE", color: "#b91c1c" },
    { name: "Aluguel", type: "EXPENSE", color: "#991b1b" },
    { name: "Energia Elétrica", type: "EXPENSE", color: "#f97316" },
    { name: "Telecomunicações", type: "EXPENSE", color: "#ea580c" },
    { name: "Impostos e Taxas", type: "EXPENSE", color: "#c2410c" },
    { name: "Salários e Encargos", type: "EXPENSE", color: "#9a3412" },
    { name: "Marketing", type: "EXPENSE", color: "#f59e0b" },
    { name: "Manutenção", type: "EXPENSE", color: "#d97706" },
    { name: "Outras Despesas", type: "EXPENSE", color: "#fca5a5" },
  ];

  await prisma.financialCategory.createMany({
    data: defaults.map((d) => ({
      companyId,
      name: d.name,
      type: d.type,
      color: d.color,
      isDefault: true,
    })),
  });

  revalidatePath("/erp");
  return { created: defaults.length };
}

// ---------------------------------------------------------------------------
// 12. Cost Centers (CRUD)
// ---------------------------------------------------------------------------

export async function getCostCenters() {
  const companyId = await getActiveCompanyId();

  return prisma.costCenter.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export async function createCostCenter(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || null;

  if (!name) throw new Error("Nome é obrigatório");

  const costCenter = await prisma.costCenter.create({
    data: {
      companyId,
      name,
      code,
    },
  });

  revalidatePath("/erp");
  return costCenter;
}

export async function updateCostCenter(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.costCenter.findFirst({
    where: { id, companyId },
  });
  if (!existing) throw new Error("Centro de custo não encontrado");

  const name = (formData.get("name") as string) || existing.name;
  const code = formData.get("code") as string | null;

  const costCenter = await prisma.costCenter.update({
    where: { id },
    data: {
      name,
      code: code ?? existing.code,
    },
  });

  revalidatePath("/erp");
  return costCenter;
}

export async function deleteCostCenter(id: string) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.costCenter.findFirst({
    where: { id, companyId },
    include: {
      invoices: { take: 1 },
      expenses: { take: 1 },
      transactions: { take: 1 },
    },
  });
  if (!existing) throw new Error("Centro de custo não encontrado");
  if (
    existing.invoices.length > 0 ||
    existing.expenses.length > 0 ||
    existing.transactions.length > 0
  ) {
    throw new Error(
      "Não é possível excluir centro de custo vinculado a registros financeiros"
    );
  }

  await prisma.costCenter.delete({ where: { id } });

  revalidatePath("/erp");
}

// ---------------------------------------------------------------------------
// 13. Bank Reconciliation
// ---------------------------------------------------------------------------

export async function getPendingReconciliations(bankAccountId: string) {
  const companyId = await getActiveCompanyId();

  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, companyId },
  });
  if (!account) throw new Error("Conta bancária não encontrada");

  const transactions = await prisma.bankTransaction.findMany({
    where: {
      bankAccountId,
      status: "PENDING",
    },
    include: {
      category: true,
    },
    orderBy: { date: "desc" },
  });
  return serialize(transactions);
}

export async function reconcileTransaction(
  transactionId: string,
  invoiceId?: string,
  expenseId?: string
) {
  const companyId = await getActiveCompanyId();

  const transaction = await prisma.bankTransaction.findFirst({
    where: { id: transactionId },
    include: { bankAccount: true },
  });
  if (!transaction) throw new Error("Transação não encontrada");
  if (transaction.bankAccount.companyId !== companyId) {
    throw new Error("Transação não pertence à empresa");
  }
  if (transaction.status === "RECONCILED") {
    throw new Error("Transação já conciliada");
  }

  await prisma.$transaction([
    prisma.bankTransaction.update({
      where: { id: transactionId },
      data: { status: "RECONCILED" },
    }),
    prisma.bankReconciliation.create({
      data: {
        companyId,
        bankAccountId: transaction.bankAccountId,
        transactionId,
        invoiceId: invoiceId || null,
        expenseId: expenseId || null,
      },
    }),
  ]);

  // If linked to an invoice, mark as paid
  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
    });
    if (invoice && invoice.status !== "PAID") {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "PAID",
          paidAt: transaction.date,
          paidValue: Math.abs(Number(transaction.value)),
          bankAccountId: transaction.bankAccountId,
        },
      });
    }
  }

  // If linked to an expense, mark as paid
  if (expenseId) {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, companyId },
    });
    if (expense && !expense.isPaid) {
      await prisma.expense.update({
        where: { id: expenseId },
        data: {
          isPaid: true,
          paidAt: transaction.date,
          paidValue: Math.abs(Number(transaction.value)),
          bankAccountId: transaction.bankAccountId,
        },
      });
    }
  }

  revalidatePath("/erp");
}

export async function autoReconcile(bankAccountId: string) {
  const companyId = await getActiveCompanyId();

  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, companyId },
  });
  if (!account) throw new Error("Conta bancária não encontrada");

  const pendingTransactions = await prisma.bankTransaction.findMany({
    where: {
      bankAccountId,
      status: "PENDING",
    },
  });

  let matched = 0;

  for (const t of pendingTransactions) {
    const absValue = Math.abs(Number(t.value));

    if (t.type === "CREDIT") {
      // Try to match with receivable invoices
      const invoice = await prisma.invoice.findFirst({
        where: {
          companyId,
          type: "RECEIVABLE",
          totalValue: absValue,
          status: { in: ["ISSUED", "OVERDUE"] },
          dueDate: {
            gte: new Date(t.date.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days before
            lte: new Date(t.date.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days after
          },
        },
        orderBy: {
          dueDate: "asc",
        },
      });

      if (invoice) {
        await reconcileTransaction(t.id, invoice.id);
        matched++;
      }
    } else {
      // Try to match with payable invoices
      const invoice = await prisma.invoice.findFirst({
        where: {
          companyId,
          type: "PAYABLE",
          totalValue: absValue,
          status: { in: ["ISSUED", "OVERDUE"] },
          dueDate: {
            gte: new Date(t.date.getTime() - 5 * 24 * 60 * 60 * 1000),
            lte: new Date(t.date.getTime() + 5 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          dueDate: "asc",
        },
      });

      if (invoice) {
        await reconcileTransaction(t.id, invoice.id);
        matched++;
        continue;
      }

      // Try to match with expenses
      const expense = await prisma.expense.findFirst({
        where: {
          companyId,
          value: absValue,
          isPaid: false,
          date: {
            gte: new Date(t.date.getTime() - 5 * 24 * 60 * 60 * 1000),
            lte: new Date(t.date.getTime() + 5 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          date: "asc",
        },
      });

      if (expense) {
        await reconcileTransaction(t.id, undefined, expense.id);
        matched++;
      }
    }
  }

  revalidatePath("/erp");
  return { total: pendingTransactions.length, matched };
}

// ---------------------------------------------------------------------------
// 14. Visão de Competência (Accrual View)
// ---------------------------------------------------------------------------

export async function getAccrualView(month: number, year: number) {
  const companyId = await getActiveCompanyId();
  const { start, end } = monthRange(month, year);

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        status: { not: "CANCELLED" },
        OR: [
          { competenceDate: { gte: start, lt: end } },
          // Fallback to dueDate when competenceDate is null
          {
            competenceDate: null,
            dueDate: { gte: start, lt: end },
          },
        ],
      },
      include: { contact: true, organization: true, financialCategory: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        companyId,
        OR: [
          { competenceDate: { gte: start, lt: end } },
          {
            competenceDate: null,
            date: { gte: start, lt: end },
          },
        ],
      },
      include: { financialCategory: true },
      orderBy: { date: "asc" },
    }),
  ]);

  return serialize({
    invoices,
    expenses,
  });
}

export async function getAccrualSummary(month: number, year: number) {
  const { invoices, expenses } = await getAccrualView(month, year);

  let receitas = 0;
  let despesas = 0;

  for (const inv of invoices) {
    const val = Number(inv.totalValue);
    if (inv.type === "RECEIVABLE") {
      receitas += val;
    } else {
      despesas += val;
    }
  }

  for (const exp of expenses) {
    despesas += Number(exp.value);
  }

  return {
    receitas,
    despesas,
    total: receitas - despesas,
  };
}

// ---------------------------------------------------------------------------
// 15. Financial Dashboard (Visão Geral)
// ---------------------------------------------------------------------------

export async function getFinancialOverview() {
  const companyId = await getActiveCompanyId();
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Summary cards
  const [
    receivablePending,
    payablePending,
    receivedThisMonth,
    paidThisMonth,
    overdueReceivable,
    overduePayable,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        companyId,
        type: "RECEIVABLE",
        status: { in: ["ISSUED", "OVERDUE"] },
      },
      _sum: { totalValue: true },
    }),
    prisma.invoice.aggregate({
      where: {
        companyId,
        type: "PAYABLE",
        status: { in: ["ISSUED", "OVERDUE"] },
      },
      _sum: { totalValue: true },
    }),
    prisma.invoice.aggregate({
      where: {
        companyId,
        type: "RECEIVABLE",
        status: "PAID",
        paidAt: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1),
        },
      },
      _sum: { paidValue: true },
    }),
    prisma.invoice.aggregate({
      where: {
        companyId,
        type: "PAYABLE",
        status: "PAID",
        paidAt: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1),
        },
      },
      _sum: { paidValue: true },
    }),
    prisma.invoice.count({
      where: {
        companyId,
        type: "RECEIVABLE",
        status: { in: ["ISSUED", "OVERDUE"] },
        dueDate: { lt: today },
      },
    }),
    prisma.invoice.count({
      where: {
        companyId,
        type: "PAYABLE",
        status: { in: ["ISSUED", "OVERDUE"] },
        dueDate: { lt: today },
      },
    }),
  ]);

  // Accounts summary
  const accounts = await prisma.bankAccount.findMany({
    where: { companyId, isActive: true },
    select: { id: true, name: true, bankName: true, balance: true, accountType: true },
    orderBy: { name: "asc" },
  });

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  // Daily cash flow preview (next 7 days)
  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);

  const upcomingReceivables = await prisma.invoice.findMany({
    where: {
      companyId,
      type: "RECEIVABLE",
      status: { in: ["ISSUED", "OVERDUE"] },
      dueDate: { gte: today, lte: next7Days },
    },
    select: { totalValue: true, dueDate: true },
    orderBy: { dueDate: "asc" },
  });

  const upcomingPayables = await prisma.invoice.findMany({
    where: {
      companyId,
      type: "PAYABLE",
      status: { in: ["ISSUED", "OVERDUE"] },
      dueDate: { gte: today, lte: next7Days },
    },
    select: { totalValue: true, dueDate: true },
    orderBy: { dueDate: "asc" },
  });

  // Sales chart data (last 6 months)
  const salesChart: { month: string; receitas: number; despesas: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const m = new Date(currentYear, currentMonth - 1 - i, 1);
    const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const monthLabel = m.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

    const [rec, pay, exp] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          type: "RECEIVABLE",
          status: "PAID",
          paidAt: { gte: m, lt: mEnd },
        },
        _sum: { paidValue: true },
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          type: "PAYABLE",
          status: "PAID",
          paidAt: { gte: m, lt: mEnd },
        },
        _sum: { paidValue: true },
      }),
      prisma.expense.aggregate({
        where: {
          companyId,
          date: { gte: m, lt: mEnd },
          isPaid: true,
        },
        _sum: { paidValue: true },
      }),
    ]);

    salesChart.push({
      month: monthLabel,
      receitas: Number(rec._sum.paidValue ?? 0),
      despesas: Number(pay._sum.paidValue ?? 0) + Number(exp._sum.paidValue ?? 0),
    });
  }

  return {
    cards: {
      totalReceivable: Number(receivablePending._sum.totalValue ?? 0),
      totalPayable: Number(payablePending._sum.totalValue ?? 0),
      receivedThisMonth: Number(receivedThisMonth._sum.paidValue ?? 0),
      paidThisMonth: Number(paidThisMonth._sum.paidValue ?? 0),
      overdueReceivableCount: overdueReceivable,
      overduePayableCount: overduePayable,
    },
    accounts: accounts.map((a) => ({
      ...a,
      balance: Number(a.balance),
    })),
    totalBalance,
    upcomingReceivables: upcomingReceivables.map((r) => ({
      value: Number(r.totalValue),
      dueDate: r.dueDate,
    })),
    upcomingPayables: upcomingPayables.map((p) => ({
      value: Number(p.totalValue),
      dueDate: p.dueDate,
    })),
    salesChart,
  };
}

// ---------------------------------------------------------------------------
// Create Payable (new PAYABLE invoice)
// ---------------------------------------------------------------------------

export async function createPayable(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const number = formData.get("number") as string;
  const totalValue = parseFloat(formData.get("totalValue") as string);
  const dueDate = new Date(formData.get("dueDate") as string);
  const competenceDate = formData.get("competenceDate")
    ? new Date(formData.get("competenceDate") as string)
    : null;
  const contactId = (formData.get("contactId") as string) || null;
  const bankAccountId = (formData.get("bankAccountId") as string) || null;
  const categoryId = (formData.get("categoryId") as string) || null;
  const paymentMethod = (formData.get("paymentMethod") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  await prisma.invoice.create({
    data: {
      companyId,
      number,
      type: "PAYABLE",
      totalValue,
      dueDate,
      competenceDate,
      contactId,
      bankAccountId,
      categoryId,
      paymentMethod,
      notes,
      status: "ISSUED",
    },
  });

  revalidatePath("/erp");
}

// ---------------------------------------------------------------------------
// Import DDA from CNAB file
// ---------------------------------------------------------------------------

export async function importDDAFromCNABFile(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const file = formData.get("file") as File;

  if (!file) {
    return { success: false, message: "Nenhum arquivo selecionado." };
  }

  const content = await file.text();

  const { importDDAFromCNAB } = await import("@/lib/itau-dda");
  const result = await importDDAFromCNAB(companyId, content);

  revalidatePath("/erp");
  return result;
}

// ---------------------------------------------------------------------------
// Save Itaú DDA Configuration
// ---------------------------------------------------------------------------

export async function saveItauConfig(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const config = {
    credentials: {
      clientId: formData.get("clientId") as string,
      clientSecret: formData.get("clientSecret") as string,
      certificatePath: formData.get("certificatePath") as string,
      certificatePassword: formData.get("certificatePassword") as string,
      cnpj: formData.get("cnpj") as string,
      agencia: formData.get("agencia") as string,
      conta: formData.get("conta") as string,
    },
    autoSync: formData.get("autoSync") === "true",
    syncInterval: parseInt(formData.get("syncInterval") as string) || 60,
  };

  const { saveItauDDAConfig } = await import("@/lib/itau-dda");
  await saveItauDDAConfig(companyId, config);

  revalidatePath("/erp");
  return { success: true, message: "Configuração salva com sucesso." };
}

// ---------------------------------------------------------------------------
// Delete Invoice
// ---------------------------------------------------------------------------

export async function deleteInvoice(id: string) {
  const companyId = await getActiveCompanyId();

  await prisma.invoice.delete({
    where: { id, companyId },
  });

  revalidatePath("/erp");
}
