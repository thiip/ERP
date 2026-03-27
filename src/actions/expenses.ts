"use server";

import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { revalidatePath } from "next/cache";
import {
  syncExpensesFromSharePoint,
  syncExpensesToSharePoint,
  fullExpensesBidirectionalSync,
} from "@/lib/expenses-sync";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert Prisma Decimal fields to plain numbers so data can be serialized to client components */
function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      if (value !== null && typeof value === "object" && typeof value.toNumber === "function") {
        return value.toNumber();
      }
      return value;
    })
  );
}

// ---------------------------------------------------------------------------
// 1. Expenses (Read)
// ---------------------------------------------------------------------------

export async function getExpenses(month?: number, year?: number) {
  const companyId = await getActiveCompanyId();

  const where: any = { companyId };
  if (month) where.referenceMonth = month;
  if (year) where.referenceYear = year;

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      bankAccount: true,
      financialCategory: true,
      costCenter: true,
    },
    orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }, { date: "asc" }],
  });
  return serialize(expenses);
}

export async function getExpensesDashboard(year: number) {
  const companyId = await getActiveCompanyId();

  const expenses = await prisma.expense.findMany({
    where: { companyId, referenceYear: year },
    select: {
      referenceMonth: true,
      value: true,
      paidValue: true,
      isPaid: true,
    },
  });

  // Aggregate by month
  const monthlyData: Record<
    number,
    { total: number; paid: number; pending: number; count: number }
  > = {};

  for (let m = 1; m <= 12; m++) {
    monthlyData[m] = { total: 0, paid: 0, pending: 0, count: 0 };
  }

  for (const e of expenses) {
    const m = e.referenceMonth || 0;
    if (!monthlyData[m]) continue;
    const val = Number(e.value);
    monthlyData[m].total += val;
    monthlyData[m].count += 1;
    if (e.isPaid) {
      monthlyData[m].paid += e.paidValue ? Number(e.paidValue) : val;
    } else {
      monthlyData[m].pending += val;
    }
  }

  return monthlyData;
}

// ---------------------------------------------------------------------------
// 2. SharePoint Sync
// ---------------------------------------------------------------------------

export async function triggerExpensesSync(
  month: number,
  year: number,
  direction: "pull" | "push" | "bidirectional" = "bidirectional"
) {
  const companyId = await getActiveCompanyId();

  let result;
  if (direction === "pull") {
    result = await syncExpensesFromSharePoint(companyId, month, year);
  } else if (direction === "push") {
    result = await syncExpensesToSharePoint(companyId, month, year);
  } else {
    result = await fullExpensesBidirectionalSync(companyId, month, year);
  }

  revalidatePath("/erp");
  return result;
}

export async function getExpensesSyncLogs() {
  const companyId = await getActiveCompanyId();

  const logs = await prisma.sharePointSyncLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return serialize(logs);
}
