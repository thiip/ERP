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

function findHeaderRow(values: string[][]): number {
  // Find the row that contains the header — skip empty rows at the top
  for (let i = 0; i < Math.min(values.length, 10); i++) {
    const row = values[i];
    const nonEmpty = row.filter((c) => c && c.toString().trim() !== "").length;
    if (nonEmpty >= 3) {
      const lower = row.map((c) => (c || "").toString().toLowerCase());
      // Check if this looks like a header row (has column-like names)
      const isHeader = lower.some(
        (h) =>
          h.includes("colaborador") ||
          h.includes("nome") ||
          h.includes("funcionario") ||
          h.includes("name") ||
          h.includes("salario") ||
          h.includes("sálario") ||
          h.includes("codigo")
      );
      if (isHeader) return i;
    }
  }
  return 0; // fallback to first row
}

function parseExcelRows(values: string[][]): ExcelSalaryRow[] {
  if (values.length < 2) return [];

  // Find actual header row (planilha Projectum has headers at row 3, not row 1)
  const headerIdx = findHeaderRow(values);
  const headers = values[headerIdx].map((h) => (h || "").toString().toLowerCase().trim());

  // Auto-detect columns — support both standard names and Projectum-specific names
  const nameIdx = headers.findIndex((h) =>
    h.includes("colaborador") || h.includes("nome") || h.includes("funcionario") || h.includes("name")
  );
  const cpfIdx = headers.findIndex((h) => h.includes("cpf"));
  const codeIdx = headers.findIndex((h) => h.includes("codigo") || h.includes("código"));
  const deptIdx = headers.findIndex((h) =>
    h.includes("depart") || h.includes("setor") || h.includes("origem")
  );
  const posIdx = headers.findIndex((h) =>
    h.includes("cargo") || h.includes("funcao") || h.includes("função") || h.includes("position")
  );
  const grossIdx = headers.findIndex((h) =>
    h.includes("salario base") || h.includes("sálario base") || h.includes("bruto") || h.includes("gross")
  );
  const totalIdx = headers.findIndex((h) =>
    h.includes("salário total") || h.includes("salario total") || h.includes("total") || h.includes("liquido") || h.includes("net")
  );
  const insaIdx = headers.findIndex((h) => h.includes("insalubridade"));
  const faltasIdx = headers.findIndex((h) => h.includes("falta"));
  const extraIdx = headers.findIndex((h) => h.includes("hora extra") || h.includes("extra"));
  const inssIdx = headers.findIndex((h) => h.includes("inss"));
  const fgtsIdx = headers.findIndex((h) => h.includes("fgts"));
  const transportIdx = headers.findIndex((h) => h.includes("transporte") || h.includes("vt"));
  const advanceIdx = headers.findIndex((h) => h.includes("adiantamento") || h.includes("advance"));
  const adjustIdx = headers.findIndex((h) => h.includes("acerto") || h.includes("adjust"));
  const dedIdx = headers.findIndex((h) => h.includes("desconto") || h.includes("deducao") || h.includes("deduction"));
  const monthIdx = headers.findIndex((h) => h.includes("mes") || h.includes("mês") || h.includes("month") || h.includes("competencia"));
  const yearIdx = headers.findIndex((h) => h.includes("ano") || h.includes("year"));
  const paidIdx = headers.findIndex((h) => h.includes("pago") || h.includes("paid") || h.includes("status"));

  const rows: ExcelSalaryRow[] = [];
  for (let i = headerIdx + 1; i < values.length; i++) {
    const row = values[i];
    const name = nameIdx >= 0 ? (row[nameIdx] || "").toString().trim() : "";
    if (!name) continue;

    // Calculate gross amount — use salario base or bruto column
    const gross = grossIdx >= 0 ? parseNumber(row[grossIdx]) : 0;
    // Add extras: insalubridade + hora extra
    const insalubridade = insaIdx >= 0 ? parseNumber(row[insaIdx]) : 0;
    const horaExtra = extraIdx >= 0 ? parseNumber(row[extraIdx]) : 0;
    const acertos = adjustIdx >= 0 ? parseNumber(row[adjustIdx]) : 0;
    const totalGross = gross + insalubridade + horaExtra + acertos;

    // Calculate deductions: INSS + FGTS + Transporte + Faltas + Adiantamento
    const inss = inssIdx >= 0 ? parseNumber(row[inssIdx]) : 0;
    const fgts = fgtsIdx >= 0 ? parseNumber(row[fgtsIdx]) : 0;
    const transporte = transportIdx >= 0 ? parseNumber(row[transportIdx]) : 0;
    const faltas = faltasIdx >= 0 ? parseNumber(row[faltasIdx]) : 0;
    const adiantamento = advanceIdx >= 0 ? parseNumber(row[advanceIdx]) : 0;
    const totalDeductions = dedIdx >= 0 ? parseNumber(row[dedIdx]) : (inss + fgts + transporte + faltas + adiantamento);

    // Net amount: use "Salário Total" column if available, else calculate
    const net = totalIdx >= 0 ? parseNumber(row[totalIdx]) : (totalGross - totalDeductions);

    rows.push({
      rowIndex: i + 1,
      name,
      cpf: cpfIdx >= 0 ? (row[cpfIdx] || "").toString().trim() : "",
      department: deptIdx >= 0 ? (row[deptIdx] || "").toString().trim() : "",
      position: posIdx >= 0 ? (row[posIdx] || "").toString().trim() : "",
      grossAmount: totalGross || gross,
      deductions: totalDeductions,
      netAmount: net,
      month: monthIdx >= 0 ? parseInt(row[monthIdx]) || new Date().getMonth() + 1 : new Date().getMonth() + 1,
      year: yearIdx >= 0 ? parseInt(row[yearIdx]) || new Date().getFullYear() : new Date().getFullYear(),
      isPaid: paidIdx >= 0 ? ["sim", "pago", "yes", "paid", "true"].includes((row[paidIdx] || "").toString().toLowerCase().trim()) : false,
      hash: hashRow(row.map((v) => (v || "").toString())),
    });
  }
  return rows;
}

// Map worksheet names to month numbers
function worksheetToMonth(name: string): number | null {
  const lower = name.toLowerCase().replace(/\s+/g, "");
  const monthMap: Record<string, number> = {
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
    jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  };
  for (const [prefix, num] of Object.entries(monthMap)) {
    if (lower.startsWith(prefix)) return num;
  }
  return null;
}

export async function syncFromSharePoint(companyId: string, month?: number, year?: number) {
  if (!isGraphConfigured()) throw new Error("SharePoint não configurado");

  const syncLog = await prisma.sharePointSyncLog.create({
    data: { companyId, direction: "FROM_SHAREPOINT", status: "IN_PROGRESS" },
  });

  try {
    // Read ALL worksheets from the spreadsheet
    const { listWorksheets } = await import("./microsoft-graph");
    let worksheets: string[];
    try {
      worksheets = await listWorksheets();
    } catch {
      // Fallback to env var worksheet name
      worksheets = [process.env.SHAREPOINT_WORKSHEET_NAME || "Sheet1"];
    }

    let totalRecordsRead = 0;
    let recordsWritten = 0;

    for (const wsName of worksheets) {
      const wsMonth = worksheetToMonth(wsName);
      // If month filter is set, skip worksheets that don't match
      if (month && wsMonth && wsMonth !== month) continue;

      let values: string[][];
      try {
        const result = await readExcelWorksheet(wsName);
        values = result.values;
      } catch {
        continue; // Skip worksheets that fail to read
      }

      const excelRows = parseExcelRows(values);
      // Override month from worksheet name if available
      if (wsMonth) {
        excelRows.forEach((r) => { r.month = wsMonth; r.year = year || new Date().getFullYear(); });
      }
      totalRecordsRead += excelRows.length;

    for (const row of excelRows) {

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
    } // end worksheets loop

    await prisma.sharePointSyncLog.update({
      where: { id: syncLog.id },
      data: { status: "COMPLETED", recordsRead: totalRecordsRead, recordsWritten, completedAt: new Date() },
    });

    return { success: true, recordsRead: totalRecordsRead, recordsWritten };
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
