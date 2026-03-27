"use server";

import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { revalidatePath } from "next/cache";
import type {
  InvoiceType,
  InvoiceStatus,
  ContractStatus,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function getInvoices() {
  const companyId = await getActiveCompanyId();

  return prisma.invoice.findMany({
    where: { companyId },
    include: { contact: true },
    orderBy: { dueDate: "desc" },
  });
}

export async function getInvoice(id: string) {
  const companyId = await getActiveCompanyId();

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: { contact: true },
  });

  if (!invoice) {
    throw new Error("Fatura não encontrada");
  }

  return invoice;
}

export async function createInvoice(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const number = formData.get("number") as string;
  const type = formData.get("type") as InvoiceType;
  const contactId = (formData.get("contactId") as string) || null;
  const totalValueStr = formData.get("totalValue") as string;
  const dueDateStr = formData.get("dueDate") as string;
  const issuedAtStr = (formData.get("issuedAt") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!number) {
    throw new Error("Número é obrigatório");
  }
  if (!type) {
    throw new Error("Tipo é obrigatório");
  }
  if (!totalValueStr) {
    throw new Error("Valor total é obrigatório");
  }
  if (!dueDateStr) {
    throw new Error("Data de vencimento é obrigatória");
  }

  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      number,
      type,
      contactId: contactId || undefined,
      totalValue: parseFloat(totalValueStr),
      dueDate: new Date(dueDateStr),
      issuedAt: issuedAtStr ? new Date(issuedAtStr) : undefined,
      notes,
      status: "DRAFT",
    },
  });

  revalidatePath("/erp");
  return invoice;
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.invoice.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error("Fatura não encontrada");
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : existing.paidAt,
    },
  });

  revalidatePath("/erp");
  return invoice;
}

export async function deleteInvoice(id: string) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.invoice.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error("Fatura não encontrada");
  }
  if (existing.status !== "DRAFT") {
    throw new Error("Somente faturas em rascunho podem ser excluídas");
  }

  await prisma.invoice.delete({ where: { id } });

  revalidatePath("/erp");
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export async function getExpenses() {
  const companyId = await getActiveCompanyId();

  return prisma.expense.findMany({
    where: { companyId },
    orderBy: { date: "desc" },
  });
}

export async function createExpense(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const valueStr = formData.get("value") as string;
  const dateStr = formData.get("date") as string;
  const isShared = formData.get("isShared") === "on";
  const splitRatioStr = (formData.get("splitRatio") as string) || null;

  if (!category) {
    throw new Error("Categoria é obrigatória");
  }
  if (!description) {
    throw new Error("Descrição é obrigatória");
  }
  if (!valueStr) {
    throw new Error("Valor é obrigatório");
  }
  if (!dateStr) {
    throw new Error("Data é obrigatória");
  }

  const expense = await prisma.expense.create({
    data: {
      companyId,
      category,
      description,
      value: parseFloat(valueStr),
      date: new Date(dateStr),
      isShared,
      splitRatio: splitRatioStr ? parseFloat(splitRatioStr) : undefined,
    },
  });

  revalidatePath("/erp");
  return expense;
}

export async function deleteExpense(id: string) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.expense.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error("Despesa não encontrada");
  }

  await prisma.expense.delete({ where: { id } });

  revalidatePath("/erp");
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

export async function getContracts() {
  const companyId = await getActiveCompanyId();

  return prisma.contract.findMany({
    where: { companyId },
    include: { contact: true },
    orderBy: { startDate: "desc" },
  });
}

export async function getContract(id: string) {
  const companyId = await getActiveCompanyId();

  const contract = await prisma.contract.findFirst({
    where: { id, companyId },
    include: { contact: true, deal: true },
  });

  if (!contract) {
    throw new Error("Contrato não encontrado");
  }

  return contract;
}

export async function createContract(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const number = formData.get("number") as string;
  const title = formData.get("title") as string;
  const contactId = formData.get("contactId") as string;
  const dealId = (formData.get("dealId") as string) || null;
  const totalValueStr = formData.get("totalValue") as string;
  const startDateStr = formData.get("startDate") as string;
  const endDateStr = formData.get("endDate") as string;

  if (!number) {
    throw new Error("Número é obrigatório");
  }
  if (!title) {
    throw new Error("Título é obrigatório");
  }
  if (!contactId) {
    throw new Error("Contato é obrigatório");
  }
  if (!totalValueStr) {
    throw new Error("Valor total é obrigatório");
  }
  if (!startDateStr || !endDateStr) {
    throw new Error("Datas de início e fim são obrigatórias");
  }

  const contract = await prisma.contract.create({
    data: {
      companyId,
      number,
      title,
      contactId,
      dealId: dealId || undefined,
      totalValue: parseFloat(totalValueStr),
      startDate: new Date(startDateStr),
      endDate: new Date(endDateStr),
      status: "DRAFT",
    },
  });

  revalidatePath("/erp");
  return contract;
}

export async function updateContractStatus(
  id: string,
  status: ContractStatus
) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.contract.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error("Contrato não encontrado");
  }

  const contract = await prisma.contract.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/erp");
  return contract;
}

export async function deleteContract(id: string) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.contract.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error("Contrato não encontrado");
  }
  if (existing.status !== "DRAFT") {
    throw new Error("Somente contratos em rascunho podem ser excluídos");
  }

  await prisma.contract.delete({ where: { id } });

  revalidatePath("/erp");
}

// ---------------------------------------------------------------------------
// Financial Summary
// ---------------------------------------------------------------------------

export async function getFinancialSummary() {
  const companyId = await getActiveCompanyId();

  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear + 1, 0, 1);

  const [
    receivableResult,
    payableResult,
    receivedResult,
    paidResult,
    expenseResult,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        companyId,
        type: "RECEIVABLE",
        status: { notIn: ["PAID", "CANCELLED"] },
      },
      _sum: { totalValue: true },
    }),
    prisma.invoice.aggregate({
      where: {
        companyId,
        type: "PAYABLE",
        status: { notIn: ["PAID", "CANCELLED"] },
      },
      _sum: { totalValue: true },
    }),
    prisma.invoice.aggregate({
      where: {
        companyId,
        type: "RECEIVABLE",
        status: "PAID",
      },
      _sum: { totalValue: true },
    }),
    prisma.invoice.aggregate({
      where: {
        companyId,
        type: "PAYABLE",
        status: "PAID",
      },
      _sum: { totalValue: true },
    }),
    prisma.expense.aggregate({
      where: {
        companyId,
        date: { gte: yearStart, lt: yearEnd },
      },
      _sum: { value: true },
    }),
  ]);

  return {
    totalReceivable: Number(receivableResult._sum.totalValue ?? 0),
    totalPayable: Number(payableResult._sum.totalValue ?? 0),
    totalReceived: Number(receivedResult._sum.totalValue ?? 0),
    totalPaid: Number(paidResult._sum.totalValue ?? 0),
    totalExpenses: Number(expenseResult._sum.value ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Financial Dashboard (enhanced)
// ---------------------------------------------------------------------------

export async function getFinancialDashboard(year: number) {
  const companyId = await getActiveCompanyId();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  // Get all invoices for the year (PAYABLE = expenses/despesas)
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      dueDate: { gte: yearStart, lt: yearEnd },
    },
    select: {
      id: true,
      number: true,
      type: true,
      totalValue: true,
      status: true,
      dueDate: true,
      paidAt: true,
      notes: true,
      category: true,
    },
    orderBy: { totalValue: "desc" },
  });

  // Get expenses for the year
  const expenses = await prisma.expense.findMany({
    where: {
      companyId,
      date: { gte: yearStart, lt: yearEnd },
    },
    select: {
      id: true,
      category: true,
      description: true,
      value: true,
      date: true,
    },
    orderBy: { value: "desc" },
  });

  // Monthly breakdown
  const monthlyPaid: number[] = Array(12).fill(0);
  const monthlyPending: number[] = Array(12).fill(0);

  // Category breakdown
  const categoryMap = new Map<string, number>();

  // Totals
  let totalDespesas = 0;
  let totalPago = 0;
  let totalPendente = 0;
  let maiorDespesa = 0;

  // All transactions for the table
  const transactions: {
    date: string;
    description: string;
    value: number;
    status: "Pago" | "Pendente";
  }[] = [];

  for (const inv of invoices) {
    const val = Number(inv.totalValue);
    const month = new Date(inv.dueDate).getMonth();
    const isPaid = inv.status === "PAID";
    const desc = inv.notes || inv.number;

    totalDespesas += val;
    if (isPaid) {
      totalPago += val;
      monthlyPaid[month] += val;
    } else {
      totalPendente += val;
      monthlyPending[month] += val;
    }
    if (val > maiorDespesa) maiorDespesa = val;

    // Category
    const catKey = inv.category || "Outros";
    categoryMap.set(catKey, (categoryMap.get(catKey) || 0) + val);

    transactions.push({
      date: new Date(inv.dueDate).toLocaleDateString("pt-BR"),
      description: desc,
      value: val,
      status: isPaid ? "Pago" : "Pendente",
    });
  }

  for (const exp of expenses) {
    const val = Number(exp.value);
    const month = new Date(exp.date).getMonth();

    totalDespesas += val;
    totalPago += val;
    monthlyPaid[month] += val;
    if (val > maiorDespesa) maiorDespesa = val;

    categoryMap.set(exp.category, (categoryMap.get(exp.category) || 0) + val);

    transactions.push({
      date: new Date(exp.date).toLocaleDateString("pt-BR"),
      description: exp.description,
      value: val,
      status: "Pago",
    });
  }

  // Add salary data
  const salaries = await prisma.salary.findMany({
    where: {
      companyId,
      referenceYear: year,
    },
    select: {
      grossAmount: true,
      netAmount: true,
      referenceMonth: true,
      isPaid: true,
      employee: { select: { name: true } },
    },
  });

  for (const sal of salaries) {
    const val = Number(sal.grossAmount);
    const month = sal.referenceMonth - 1; // 0-indexed

    totalDespesas += val;
    if (sal.isPaid) {
      totalPago += val;
      monthlyPaid[month] += val;
    } else {
      totalPendente += val;
      monthlyPending[month] += val;
    }
    if (val > maiorDespesa) maiorDespesa = val;

    categoryMap.set("Salários", (categoryMap.get("Salários") || 0) + val);

    transactions.push({
      date: `01/${String(sal.referenceMonth).padStart(2, "0")}/${year}`,
      description: `Salário - ${sal.employee.name}`,
      value: val,
      status: sal.isPaid ? "Pago" : "Pendente",
    });
  }

  // Sort transactions by value descending
  transactions.sort((a, b) => b.value - a.value);

  // Top categories
  const categories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // Available years (check which years have data)
  const allInvoiceYears = await prisma.invoice.findMany({
    where: { companyId },
    select: { dueDate: true },
    distinct: ["dueDate"],
  });
  const yearsSet = new Set<number>();
  for (const inv of allInvoiceYears) {
    yearsSet.add(new Date(inv.dueDate).getFullYear());
  }
  yearsSet.add(year);
  const availableYears = [...yearsSet].sort((a, b) => b - a);

  return {
    totalDespesas,
    totalPago,
    totalPendente,
    maiorDespesa,
    monthlyPaid,
    monthlyPending,
    categories,
    transactions: transactions.slice(0, 50),
    availableYears,
  };
}
