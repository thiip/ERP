"use server";

import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { revalidatePath } from "next/cache";
import type { EmployeeStatus, SalaryType } from "@/generated/prisma/client";
import { syncFromSharePoint, syncToSharePoint, fullBidirectionalSync } from "@/lib/sharepoint-sync";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// 1. Employees (CRUD)
// ---------------------------------------------------------------------------

export async function getEmployees() {
  const companyId = await getActiveCompanyId();

  const employees = await prisma.employee.findMany({
    where: { companyId },
    include: { costCenter: true },
    orderBy: { name: "asc" },
  });
  return serialize(employees);
}

export async function createEmployee(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const name = formData.get("name") as string;
  const cpf = (formData.get("cpf") as string) || null;
  const position = (formData.get("position") as string) || null;
  const department = (formData.get("department") as string) || null;
  const hireDateStr = formData.get("hireDate") as string | null;
  const baseSalaryStr = (formData.get("baseSalary") as string) || "0";
  const costCenterId = (formData.get("costCenterId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!name) throw new Error("Nome é obrigatório");

  const employee = await prisma.employee.create({
    data: {
      companyId,
      name,
      cpf,
      position,
      department,
      hireDate: hireDateStr ? new Date(hireDateStr) : null,
      baseSalary: parseBRLValue(baseSalaryStr),
      costCenterId,
      notes,
    },
  });

  revalidatePath("/erp");
  return serialize(employee);
}

export async function updateEmployee(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.employee.findFirst({
    where: { id, companyId },
  });
  if (!existing) throw new Error("Funcionário não encontrado");

  const name = formData.get("name") as string;
  const cpf = (formData.get("cpf") as string) || null;
  const position = (formData.get("position") as string) || null;
  const department = (formData.get("department") as string) || null;
  const hireDateStr = formData.get("hireDate") as string | null;
  const terminationDateStr = formData.get("terminationDate") as string | null;
  const baseSalaryStr = formData.get("baseSalary") as string | null;
  const status = (formData.get("status") as EmployeeStatus) || existing.status;
  const costCenterId = (formData.get("costCenterId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      name: name || existing.name,
      cpf,
      position,
      department,
      hireDate: hireDateStr ? new Date(hireDateStr) : existing.hireDate,
      terminationDate: terminationDateStr ? new Date(terminationDateStr) : existing.terminationDate,
      ...(baseSalaryStr ? { baseSalary: parseBRLValue(baseSalaryStr) } : {}),
      status,
      costCenterId,
      notes,
    },
  });

  revalidatePath("/erp");
  return serialize(employee);
}

export async function deleteEmployee(id: string) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.employee.findFirst({
    where: { id, companyId },
  });
  if (!existing) throw new Error("Funcionário não encontrado");

  // Soft delete: set status to TERMINATED
  await prisma.employee.update({
    where: { id },
    data: {
      status: "TERMINATED",
      terminationDate: new Date(),
    },
  });

  revalidatePath("/erp");
}

// ---------------------------------------------------------------------------
// 2. Salaries
// ---------------------------------------------------------------------------

export async function getSalaries(month?: number, year?: number) {
  const companyId = await getActiveCompanyId();

  const where: any = { companyId };
  if (month) where.referenceMonth = month;
  if (year) where.referenceYear = year;

  const salaries = await prisma.salary.findMany({
    where,
    include: {
      employee: true,
      bankAccount: true,
      financialCategory: true,
      costCenter: true,
    },
    orderBy: [{ referenceYear: "desc" }, { referenceMonth: "desc" }, { employee: { name: "asc" } }],
  });
  return serialize(salaries);
}

export async function getSalaryDashboard(year: number) {
  const companyId = await getActiveCompanyId();

  const salaries = await prisma.salary.findMany({
    where: { companyId, referenceYear: year },
    select: {
      referenceMonth: true,
      grossAmount: true,
      deductions: true,
      netAmount: true,
      isPaid: true,
    },
  });

  // Aggregate by month
  const monthlyData: Record<number, { gross: number; deductions: number; net: number; paid: number; pending: number; count: number }> = {};

  for (let m = 1; m <= 12; m++) {
    monthlyData[m] = { gross: 0, deductions: 0, net: 0, paid: 0, pending: 0, count: 0 };
  }

  for (const s of salaries) {
    const m = s.referenceMonth;
    if (!monthlyData[m]) continue;
    const gross = Number(s.grossAmount);
    const ded = Number(s.deductions);
    const net = Number(s.netAmount);
    monthlyData[m].gross += gross;
    monthlyData[m].deductions += ded;
    monthlyData[m].net += net;
    monthlyData[m].count += 1;
    if (s.isPaid) {
      monthlyData[m].paid += net;
    } else {
      monthlyData[m].pending += net;
    }
  }

  return monthlyData;
}

export async function createSalary(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const employeeId = formData.get("employeeId") as string;
  const type = (formData.get("type") as SalaryType) || "MONTHLY";
  const referenceMonth = parseInt(formData.get("referenceMonth") as string);
  const referenceYear = parseInt(formData.get("referenceYear") as string);
  const grossAmountStr = (formData.get("grossAmount") as string) || "0";
  const deductionsStr = (formData.get("deductions") as string) || "0";
  const netAmountStr = (formData.get("netAmount") as string) || "0";
  const bankAccountId = (formData.get("bankAccountId") as string) || null;
  const categoryId = (formData.get("categoryId") as string) || null;
  const costCenterId = (formData.get("costCenterId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!employeeId) throw new Error("Funcionário é obrigatório");
  if (!referenceMonth || !referenceYear) throw new Error("Mês/Ano de referência são obrigatórios");

  const salary = await prisma.salary.create({
    data: {
      companyId,
      employeeId,
      type,
      referenceMonth,
      referenceYear,
      grossAmount: parseBRLValue(grossAmountStr),
      deductions: parseBRLValue(deductionsStr),
      netAmount: parseBRLValue(netAmountStr),
      bankAccountId,
      categoryId,
      costCenterId,
      notes,
    },
  });

  revalidatePath("/erp");
  return serialize(salary);
}

export async function markSalaryPaid(id: string) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.salary.findFirst({
    where: { id, companyId },
  });
  if (!existing) throw new Error("Registro de salário não encontrado");

  const salary = await prisma.salary.update({
    where: { id },
    data: {
      isPaid: true,
      paidAt: new Date(),
    },
  });

  revalidatePath("/erp");
  return serialize(salary);
}

export async function bulkCreateMonthlySalaries(month: number, year: number) {
  const companyId = await getActiveCompanyId();

  // Get all active employees
  const employees = await prisma.employee.findMany({
    where: { companyId, status: "ACTIVE" },
  });

  let created = 0;
  let skipped = 0;

  for (const emp of employees) {
    // Check if salary already exists
    const existing = await prisma.salary.findUnique({
      where: {
        companyId_employeeId_type_referenceMonth_referenceYear: {
          companyId,
          employeeId: emp.id,
          type: "MONTHLY",
          referenceMonth: month,
          referenceYear: year,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const gross = Number(emp.baseSalary);
    await prisma.salary.create({
      data: {
        companyId,
        employeeId: emp.id,
        type: "MONTHLY",
        referenceMonth: month,
        referenceYear: year,
        grossAmount: gross,
        deductions: 0,
        netAmount: gross,
      },
    });
    created++;
  }

  revalidatePath("/erp");
  return { created, skipped, total: employees.length };
}

// ---------------------------------------------------------------------------
// 3. SharePoint Sync
// ---------------------------------------------------------------------------

export async function triggerSharePointSync(
  month: number,
  year: number,
  direction: "pull" | "push" | "bidirectional"
) {
  const companyId = await getActiveCompanyId();

  if (direction === "pull") {
    return await syncFromSharePoint(companyId, month, year);
  } else if (direction === "push") {
    return await syncToSharePoint(companyId, month, year);
  } else {
    return await fullBidirectionalSync(companyId, month, year);
  }
}

export async function getSyncLogs() {
  const companyId = await getActiveCompanyId();

  const logs = await prisma.sharePointSyncLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return serialize(logs);
}
