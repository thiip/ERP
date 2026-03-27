import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  readExcelWorksheetFromFile,
  writeExcelRangeToFile,
  listWorksheetsFromFile,
  isGraphConfigured,
} from "./microsoft-graph";

const EXPENSES_FILE_ID =
  process.env.SHAREPOINT_EXPENSES_FILE_ID || "01HOY6XZESK4NUVLZQTRBLBTVJNEGMDKGJ";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashRow(row: string[]): string {
  return createHash("sha256").update(row.join("|")).digest("hex").substring(0, 16);
}

function parseNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  return parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0;
}

/**
 * Convert Excel serial date number to JS Date.
 * Excel epoch is 1900-01-01 (serial 1), but there's a known bug where Excel
 * treats 1900 as a leap year (serial 60 = Feb 29, 1900 which doesn't exist).
 * The standard conversion: JS Date = (serial - 25569) * 86400 * 1000
 */
function excelSerialToDate(serial: number | string | null | undefined): Date | null {
  if (serial === null || serial === undefined || serial === "") return null;
  const num = typeof serial === "string" ? parseFloat(serial) : serial;
  if (isNaN(num) || num <= 0) return null;
  // Excel serial to JS timestamp: subtract the number of days between
  // Excel epoch (1900-01-01) and Unix epoch (1970-01-01) = 25569 days
  const date = new Date((num - 25569) * 86400 * 1000);
  // Sanity check — if date is way out of range, return null
  if (date.getFullYear() < 2000 || date.getFullYear() > 2100) return null;
  return date;
}

/**
 * Convert JS Date to Excel serial number.
 */
function dateToExcelSerial(date: Date): number {
  return Math.round(date.getTime() / (86400 * 1000) + 25569);
}

// Map Portuguese month names to numbers
const MONTH_NAME_MAP: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  "março": 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

/**
 * Parse worksheet name like "JANEIRO 2026" into { month, year }.
 */
function parseWorksheetName(name: string): { month: number; year: number } | null {
  const lower = name.toLowerCase().trim();
  for (const [monthName, monthNum] of Object.entries(MONTH_NAME_MAP)) {
    if (lower.startsWith(monthName)) {
      // Try to extract year from the name
      const yearMatch = lower.match(/\d{4}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
      return { month: monthNum, year };
    }
  }
  // Fallback: try abbreviated month names
  const shortMap: Record<string, number> = {
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
    jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  };
  for (const [prefix, num] of Object.entries(shortMap)) {
    if (lower.startsWith(prefix)) {
      const yearMatch = lower.match(/\d{4}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
      return { month: num, year };
    }
  }
  return null;
}

/**
 * Map month number to Portuguese month name (uppercase).
 */
function monthToPortuguese(month: number): string {
  const names = [
    "", "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
  ];
  return names[month] || "";
}

/**
 * Determine if a status string means "paid".
 */
function isPaidStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const lower = status.toString().toLowerCase().trim();
  return (
    lower.includes("pago") ||
    lower.includes("pix") ||
    lower.includes("debito automatico") ||
    lower.includes("débito automático") ||
    lower === "paid"
  );
}

// ---------------------------------------------------------------------------
// Expense category classification
// ---------------------------------------------------------------------------

function classifyExpenseCategory(description: string): string {
  const d = description.toLowerCase();

  // Aluguel
  if (d.includes("aluguel")) return "ALUGUEL";
  // Energia / Utilities
  if (d.includes("cemig") || d.includes("energia") || d.includes("luz")) return "ENERGIA";
  // Água
  if (d.includes("copasa") || d.includes("água") || d.includes("agua")) return "ÁGUA";
  // Internet / Telecom
  if (d.includes("internet") || d.includes("telefone") || d.includes("tel ") || d.includes("vivo") || d.includes("claro") || d.includes("tim") || d.includes("oi ")) return "TELECOM";
  // Impostos / Tributos
  if (d.includes("simples nacional") || d.includes("guia simples") || d.includes("imposto") || d.includes("darf") || d.includes("fgts") || d.includes("inss") || d.includes("gps") || d.includes("das ") || d.includes("icms") || d.includes("iss")) return "IMPOSTOS";
  // Banco / Financeiro
  if (d.includes("bdmg") || d.includes("empréstimo") || d.includes("emprestimo") || d.includes("financiamento") || d.includes("parcela banco") || d.includes("juros") || d.includes("tarifa")) return "FINANCEIRO";
  // Fornecedores / Materiais
  if (d.includes("flor") || d.includes("jc decor") || d.includes("material") || d.includes("eletro") || d.includes("ferrament")) return "FORNECEDORES";
  // Transporte / Frete
  if (d.includes("caminhão") || d.includes("caminhao") || d.includes("frete") || d.includes("transporte") || d.includes("combustível") || d.includes("combustivel") || d.includes("gasolina") || d.includes("diesel")) return "TRANSPORTE";
  // Salários / RH
  if (d.includes("salário") || d.includes("salario") || d.includes("folha") || d.includes("rescisão") || d.includes("rescisao") || d.includes("férias") || d.includes("ferias") || d.includes("13°") || d.includes("décimo")) return "PESSOAL";
  // Alimentação
  if (d.includes("alimenta") || d.includes("refeição") || d.includes("refeicao") || d.includes("marmita") || d.includes("restaurante") || d.includes("lanch")) return "ALIMENTAÇÃO";
  // Seguro
  if (d.includes("seguro")) return "SEGUROS";
  // Manutenção
  if (d.includes("manutenção") || d.includes("manutencao") || d.includes("reparo") || d.includes("conserto")) return "MANUTENÇÃO";
  // Contabilidade / Serviços
  if (d.includes("contab") || d.includes("contador") || d.includes("honorário") || d.includes("honorario") || d.includes("consultoria")) return "SERVIÇOS";
  // Pix / Transferências genéricas
  if (d.includes("pix ") || d.includes("transferência") || d.includes("transferencia")) return "TRANSFERÊNCIAS";

  return "OUTROS";
}

// ---------------------------------------------------------------------------
// Excel row parsing
// ---------------------------------------------------------------------------

interface ExcelExpenseRow {
  rowIndex: number;
  invoiceNumber: string;
  dueDate: Date | null;
  description: string;
  value: number;
  updatedValue: number;
  paymentDate: Date | null;
  statusText: string;
  isPaid: boolean;
  hash: string;
}

function findExpenseHeaderRow(values: string[][]): number {
  for (let i = 0; i < Math.min(values.length, 10); i++) {
    const row = values[i];
    const nonEmpty = row.filter((c) => c && c.toString().trim() !== "").length;
    if (nonEmpty >= 3) {
      const lower = row.map((c) => (c || "").toString().toLowerCase());
      const isHeader = lower.some(
        (h) =>
          h.includes("nota fiscal") ||
          h.includes("contas") ||
          h.includes("valor") ||
          h.includes("vencimento") ||
          h.includes("status")
      );
      if (isHeader) return i;
    }
  }
  return 0;
}

function parseExpenseRows(values: string[][]): ExcelExpenseRow[] {
  if (values.length < 2) return [];

  const headerIdx = findExpenseHeaderRow(values);
  const headers = values[headerIdx].map((h) => (h || "").toString().toLowerCase().trim());

  // Auto-detect columns
  const invoiceIdx = headers.findIndex((h) =>
    h.includes("nota fiscal") || h.includes("nf") || h.includes("invoice")
  );
  const dueDateIdx = headers.findIndex((h) =>
    h.includes("data vencimento") || h.includes("vencimento") || h.includes("due")
  );
  const descIdx = headers.findIndex((h) =>
    h.includes("contas") || h.includes("descri") || h.includes("description")
  );
  const valueIdx = headers.findIndex((h) => {
    // Match "VALOR" but not "VALOR ATUALIZADO"
    return h === "valor" || (h.includes("valor") && !h.includes("atualizado"));
  });
  const updatedValueIdx = headers.findIndex((h) =>
    h.includes("valor atualizado") || h.includes("updated")
  );
  const paymentDateIdx = headers.findIndex((h) =>
    h.includes("data pagamento") || h.includes("pagamento") || h.includes("payment date")
  );
  const statusIdx = headers.findIndex((h) =>
    h.includes("status")
  );

  const rows: ExcelExpenseRow[] = [];
  for (let i = headerIdx + 1; i < values.length; i++) {
    const row = values[i];

    // Need at least a description or invoice number to be a valid row
    const description = descIdx >= 0 ? (row[descIdx] || "").toString().trim() : "";
    const invoiceNumber = invoiceIdx >= 0 ? (row[invoiceIdx] || "").toString().trim() : "";
    if (!description && !invoiceNumber) continue;

    const value = valueIdx >= 0 ? parseNumber(row[valueIdx]) : 0;
    // Skip rows with zero value (likely empty/separator rows)
    if (value === 0 && !description) continue;

    const updatedValue = updatedValueIdx >= 0 ? parseNumber(row[updatedValueIdx]) : 0;
    const statusText = statusIdx >= 0 ? (row[statusIdx] || "").toString().trim() : "";

    // Parse dates — they might be Excel serial numbers or date strings
    let dueDate: Date | null = null;
    if (dueDateIdx >= 0 && row[dueDateIdx]) {
      const raw = row[dueDateIdx];
      if (typeof raw === "number" || /^\d+(\.\d+)?$/.test(raw.toString().trim())) {
        dueDate = excelSerialToDate(raw);
      } else {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) dueDate = parsed;
      }
    }

    let paymentDate: Date | null = null;
    if (paymentDateIdx >= 0 && row[paymentDateIdx]) {
      const raw = row[paymentDateIdx];
      if (typeof raw === "number" || /^\d+(\.\d+)?$/.test(raw.toString().trim())) {
        paymentDate = excelSerialToDate(raw);
      } else {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) paymentDate = parsed;
      }
    }

    rows.push({
      rowIndex: i + 1,
      invoiceNumber,
      dueDate,
      description,
      value,
      updatedValue,
      paymentDate,
      statusText,
      isPaid: isPaidStatus(statusText),
      hash: hashRow(row.map((v) => (v || "").toString())),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Sync: SharePoint -> Database
// ---------------------------------------------------------------------------

export async function syncExpensesFromSharePoint(
  companyId: string,
  month?: number,
  year?: number
) {
  if (!isGraphConfigured()) throw new Error("SharePoint não configurado");

  const syncLog = await prisma.sharePointSyncLog.create({
    data: { companyId, direction: "FROM_SHAREPOINT", status: "IN_PROGRESS" },
  });

  try {
    let worksheets: string[];
    try {
      worksheets = await listWorksheetsFromFile(EXPENSES_FILE_ID);
    } catch {
      worksheets = ["Sheet1"];
    }

    let totalRecordsRead = 0;
    let recordsWritten = 0;

    // Build a map of worksheet names for push-back (preserves exact SP names including trailing spaces)
    const wsNameMap = new Map<number, string>();
    for (const wsName of worksheets) {
      const parsed = parseWorksheetName(wsName);
      if (parsed) wsNameMap.set(parsed.month, wsName); // Keep exact name from SharePoint
    }

    for (const wsName of worksheets) {
      const parsed = parseWorksheetName(wsName);
      // If month/year filter is set, skip worksheets that don't match
      if (month && parsed && parsed.month !== month) continue;
      if (year && parsed && parsed.year !== year) continue;

      const wsMonth = parsed?.month || month || new Date().getMonth() + 1;
      const wsYear = parsed?.year || year || new Date().getFullYear();

      let values: string[][];
      try {
        const result = await readExcelWorksheetFromFile(EXPENSES_FILE_ID, wsName);
        values = result.values;
      } catch (err: any) {
        // Skip worksheets that fail — don't abort entire sync
        console.error(`Skipping worksheet "${wsName}": ${err.message}`);
        continue;
      }

      const expenseRows = parseExpenseRows(values);
      totalRecordsRead += expenseRows.length;

      for (const row of expenseRows) {
        // Build a unique key from invoiceNumber + description + month + year
        // If invoiceNumber is empty, use description as fallback key
        const lookupKey = row.invoiceNumber || row.description;
        if (!lookupKey) continue;

        // Try to find existing expense by invoice number or description within the same period
        const existing = await prisma.expense.findFirst({
          where: {
            companyId,
            referenceMonth: wsMonth,
            referenceYear: wsYear,
            OR: [
              ...(row.invoiceNumber ? [{ invoiceNumber: row.invoiceNumber }] : []),
              {
                description: row.description,
                invoiceNumber: row.invoiceNumber || null,
              },
            ],
          },
        });

        const expenseData = {
          category: classifyExpenseCategory(row.description),
          description: row.description,
          value: row.value,
          paidValue: row.updatedValue || null,
          date: row.dueDate || new Date(wsYear, wsMonth - 1, 1),
          dueDate: row.dueDate,
          paidAt: row.paymentDate,
          isPaid: row.isPaid,
          invoiceNumber: row.invoiceNumber || null,
          statusText: row.statusText || null,
          referenceMonth: wsMonth,
          referenceYear: wsYear,
          sharepointRowHash: row.hash,
          paymentMethod: row.isPaid ? row.statusText : null,
        };

        if (existing) {
          // Only update if the hash changed (data was modified in SharePoint)
          if (existing.sharepointRowHash !== row.hash) {
            await prisma.expense.update({
              where: { id: existing.id },
              data: expenseData,
            });
          }
        } else {
          await prisma.expense.create({
            data: {
              companyId,
              ...expenseData,
            },
          });
        }
        recordsWritten++;
      }
    }

    await prisma.sharePointSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "COMPLETED",
        recordsRead: totalRecordsRead,
        recordsWritten,
        completedAt: new Date(),
      },
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

// ---------------------------------------------------------------------------
// Sync: Database -> SharePoint
// ---------------------------------------------------------------------------

export async function syncExpensesToSharePoint(
  companyId: string,
  month: number,
  year: number
) {
  if (!isGraphConfigured()) throw new Error("SharePoint não configurado");

  const syncLog = await prisma.sharePointSyncLog.create({
    data: { companyId, direction: "TO_SHAREPOINT", status: "IN_PROGRESS" },
  });

  try {
    const expenses = await prisma.expense.findMany({
      where: { companyId, referenceMonth: month, referenceYear: year },
      orderBy: { date: "asc" },
    });

    // Use exact worksheet name from SharePoint (may have trailing spaces or special chars)
    let worksheetName = `${monthToPortuguese(month)} ${year}`;
    try {
      const allWs = await listWorksheetsFromFile(EXPENSES_FILE_ID);
      const matchingWs = allWs.find((ws) => {
        const parsed = parseWorksheetName(ws);
        return parsed && parsed.month === month && parsed.year === year;
      });
      if (matchingWs) worksheetName = matchingWs; // Use exact name from SharePoint
    } catch {
      // Use constructed name as fallback
    }

    const header = [
      "NOTA FISCAL",
      "DATA VENCIMENTO",
      "CONTAS",
      "VALOR",
      "VALOR ATUALIZADO",
      "DATA PAGAMENTO",
      "STATUS",
    ];

    const rows = expenses.map((e) => [
      e.invoiceNumber || "",
      e.dueDate ? dateToExcelSerial(e.dueDate) : "",
      e.description,
      Number(e.value),
      e.paidValue ? Number(e.paidValue) : "",
      e.paidAt ? dateToExcelSerial(e.paidAt) : "",
      e.statusText || (e.isPaid ? "PAGO JUST" : ""),
    ]);

    if (rows.length > 0) {
      const allRows: (string | number | null)[][] = [header, ...rows];
      const lastCol = String.fromCharCode(64 + header.length); // G
      const range = `A1:${lastCol}${allRows.length}`;
      await writeExcelRangeToFile(EXPENSES_FILE_ID, range, allRows, worksheetName);

      // Update hashes
      for (let i = 0; i < expenses.length; i++) {
        const hash = hashRow(rows[i].map((v) => (v || "").toString()));
        await prisma.expense.update({
          where: { id: expenses[i].id },
          data: { sharepointRowHash: hash },
        });
      }
    }

    await prisma.sharePointSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "COMPLETED",
        recordsRead: expenses.length,
        recordsWritten: rows.length,
        completedAt: new Date(),
      },
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

// ---------------------------------------------------------------------------
// Bidirectional sync
// ---------------------------------------------------------------------------

export async function fullExpensesBidirectionalSync(
  companyId: string,
  month: number,
  year: number
) {
  // Pull ALL worksheets from SharePoint (not just the filtered month)
  const pullResult = await syncExpensesFromSharePoint(companyId, undefined, year);
  // Push only the specific month back
  let pushResult = { success: true, recordsWritten: 0 };
  try {
    pushResult = await syncExpensesToSharePoint(companyId, month, year);
  } catch (err: any) {
    console.error(`Push failed for month ${month}: ${err.message}`);
    pushResult = { success: false, recordsWritten: 0 } as any;
  }
  return { pull: pullResult, push: pushResult };
}
