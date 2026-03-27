import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { readExcelWorksheet, writeExcelRange, appendExcelRows, isGraphConfigured } from "./microsoft-graph";

function hashRow(row: string[]): string {
  return createHash("sha256").update(row.join("|")).digest("hex").substring(0, 16);
}

interface ExcelSalaryRow {
  rowIndex: number;
  name: string;
  cpf: string;
  department: string;
  position: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  month: number;
  year: number;
  isPaid: boolean;
  hash: string;
}

function parseNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  return parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0;
}

function parseExcelRows(values: string[][]): ExcelSalaryRow[] {
  if (values.length < 2) return [];
  const headers = values[0].map((h) => (h || "").toString().toLowerCase().trim());

  // Auto-detect columns
  const nameIdx = headers.findIndex((h) => h.includes("nome") || h.includes("funcionario") || h.includes("name"));
  const cpfIdx = headers.findIndex((h) => h.includes("cpf"));
  const deptIdx = headers.findIndex((h) => h.includes("depart") || h.includes("setor"));
  const posIdx = headers.findIndex((h) => h.includes("cargo") || h.includes("funcao") || h.includes("position"));
  const grossIdx = headers.findIndex((h) => h.includes("bruto") || h.includes("salario") || h.includes("gross"));
  const dedIdx = headers.findIndex((h) => h.includes("desconto") || h.includes("deducao") || h.includes("deduction"));
  const netIdx = headers.findIndex((h) => h.includes("liquido") || h.includes("net"));
  const monthIdx = headers.findIndex((h) => h.includes("mes") || h.includes("month") || h.includes("competencia"));
  const yearIdx = headers.findIndex((h) => h.includes("ano") || h.includes("year"));
  const paidIdx = headers.findIndex((h) => h.includes("pago") || h.includes("paid") || h.includes("status"));

  const rows: ExcelSalaryRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const name = nameIdx >= 0 ? (row[nameIdx] || "").toString().trim() : "";
    if (!name) continue;

    rows.push({
      rowIndex: i + 1,
      name,
      cpf: cpfIdx >= 0 ? (row[cpfIdx] || "").toString().trim() : "",
      department: deptIdx >= 0 ? (row[deptIdx] || "").toString().trim() : "",
      position: posIdx >= 0 ? (row[posIdx] || "").toString().trim() : "",
      grossAmount: grossIdx >= 0 ? parseNumber(row[grossIdx]) : 0,
      deductions: dedIdx >= 0 ? parseNumber(row[dedIdx]) : 0,
      netAmount: netIdx >= 0 ? parseNumber(row[netIdx]) : 0,
      month: monthIdx >= 0 ? parseInt(row[monthIdx]) || new Date().getMonth() + 1 : new Date().getMonth() + 1,
      year: yearIdx >= 0 ? parseInt(row[yearIdx]) || new Date().getFullYear() : new Date().getFullYear(),
      isPaid: paidIdx >= 0 ? ["sim", "pago", "yes", "paid", "true"].includes((row[paidIdx] || "").toString().toLowerCase().trim()) : false,
      hash: hashRow(row.map((v) => (v || "").toString())),
    });
  }
  return rows;
}

export async function syncFromSharePoint(companyId: string, month?: number, year?: number) {
  if (!isGraphConfigured()) throw new Error("SharePoint não configurado");

  const syncLog = await prisma.sharePointSyncLog.create({
    data: { companyId, direction: "FROM_SHAREPOINT", status: "IN_PROGRESS" },
  });

  try {
    const { values } = await readExcelWorksheet();
    const excelRows = parseExcelRows(values);
    let recordsRead = excelRows.length;
    let recordsWritten = 0;

    for (const row of excelRows) {
      if (month && row.month !== month) continue;
      if (year && row.year !== year) continue;

      // Find or create employee
      let employee = await prisma.employee.findFirst({
        where: {
          companyId,
          OR: [
            ...(row.cpf ? [{ cpf: row.cpf }] : []),
            { name: row.name },
          ],
        },
      });

      if (!employee) {
        employee = await prisma.employee.create({
          data: {
            companyId,
            name: row.name,
            cpf: row.cpf || null,
            department: row.department || null,
            position: row.position || null,
            baseSalary: row.grossAmount,
            externalRowIndex: row.rowIndex,
          },
        });
      }

      // Upsert salary
      await prisma.salary.upsert({
        where: {
          companyId_employeeId_type_referenceMonth_referenceYear: {
            companyId,
            employeeId: employee.id,
            type: "MONTHLY",
            referenceMonth: row.month,
            referenceYear: row.year,
          },
        },
        create: {
          companyId,
          employeeId: employee.id,
          type: "MONTHLY",
          referenceMonth: row.month,
          referenceYear: row.year,
          grossAmount: row.grossAmount,
          deductions: row.deductions,
          netAmount: row.netAmount,
          isPaid: row.isPaid,
          sharepointRowHash: row.hash,
        },
        update: {
          grossAmount: row.grossAmount,
          deductions: row.deductions,
          netAmount: row.netAmount,
          isPaid: row.isPaid,
          sharepointRowHash: row.hash,
        },
      });
      recordsWritten++;
    }

    await prisma.sharePointSyncLog.update({
      where: { id: syncLog.id },
      data: { status: "COMPLETED", recordsRead, recordsWritten, completedAt: new Date() },
    });

    return { success: true, recordsRead, recordsWritten };
  } catch (err: any) {
    await prisma.sharePointSyncLog.update({
      where: { id: syncLog.id },
      data: { status: "FAILED", errorMessage: err.message, completedAt: new Date() },
    });
    throw err;
  }
}

export async function syncToSharePoint(companyId: string, month: number, year: number) {
  if (!isGraphConfigured()) throw new Error("SharePoint não configurado");

  const syncLog = await prisma.sharePointSyncLog.create({
    data: { companyId, direction: "TO_SHAREPOINT", status: "IN_PROGRESS" },
  });

  try {
    const salaries = await prisma.salary.findMany({
      where: { companyId, referenceMonth: month, referenceYear: year },
      include: { employee: true },
      orderBy: { employee: { name: "asc" } },
    });

    const rows = salaries.map((s) => [
      s.employee.name,
      s.employee.cpf || "",
      s.employee.department || "",
      s.employee.position || "",
      Number(s.grossAmount),
      Number(s.deductions),
      Number(s.netAmount),
      s.referenceMonth,
      s.referenceYear,
      s.isPaid ? "Pago" : "Pendente",
    ]);

    if (rows.length > 0) {
      // Write header + data (overwrites the worksheet)
      const header = ["Nome", "CPF", "Departamento", "Cargo", "Salário Bruto", "Descontos", "Salário Líquido", "Mês", "Ano", "Status"];
      const allRows = [header, ...rows];
      const lastCol = String.fromCharCode(64 + header.length);
      const range = `A1:${lastCol}${allRows.length}`;
      await writeExcelRange(range, allRows);

      // Update hashes
      for (let i = 0; i < salaries.length; i++) {
        const hash = hashRow(rows[i].map((v) => (v || "").toString()));
        await prisma.salary.update({
          where: { id: salaries[i].id },
          data: { sharepointRowHash: hash },
        });
      }
    }

    await prisma.sharePointSyncLog.update({
      where: { id: syncLog.id },
      data: { status: "COMPLETED", recordsRead: salaries.length, recordsWritten: rows.length, completedAt: new Date() },
    });

    return { success: true, recordsWritten: rows.length };
  } catch (err: any) {
    await prisma.sharePointSyncLog.update({
      where: { id: syncLog.id },
      data: { status: "FAILED", errorMessage: err.message, completedAt: new Date() },
    });
    throw err;
  }
}

export async function fullBidirectionalSync(companyId: string, month: number, year: number) {
  // Pull from SharePoint first, then push local changes back
  const pullResult = await syncFromSharePoint(companyId, month, year);
  const pushResult = await syncToSharePoint(companyId, month, year);
  return { pull: pullResult, push: pushResult };
}
