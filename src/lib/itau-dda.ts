/**
 * Itaú DDA (Débito Direto Autorizado) Integration Module
 *
 * DDA is a Brazilian banking system that digitally notifies companies
 * about boletos (bank slips) registered against their CNPJ. Instead of
 * receiving paper boletos, companies get electronic notifications.
 *
 * Integration approaches:
 * 1. Open Finance Brasil (Open Banking) - OAuth2 + REST APIs
 * 2. CNAB 240 file processing - Batch file import/export
 * 3. Itaú Empresas API - Direct corporate API
 *
 * This module implements approach 1 (Open Finance) with fallback to
 * approach 2 (CNAB file import) for flexibility.
 */

import { prisma } from "@/lib/prisma";

// ==========================================================================
// Types
// ==========================================================================

export type ItauCredentials = {
  clientId: string;
  clientSecret: string;
  certificatePath: string; // mTLS certificate
  certificatePassword: string;
  cnpj: string;
  agencia: string;
  conta: string;
};

export type DDABoletoData = {
  supplierName: string;
  supplierCnpj: string;
  issueDate: Date;
  dueDate: Date;
  value: number;
  barcode: string;
  digitableLine: string;
  externalId: string;
};

export type ItauDDAConfig = {
  companyId: string;
  credentials: ItauCredentials;
  autoSync: boolean;
  syncInterval: number; // minutes
};

// ==========================================================================
// Open Finance Brasil - OAuth2 Token Management
// ==========================================================================

const ITAU_AUTH_URL = "https://sts.itau.com.br/api/oauth/token";
const ITAU_DDA_API_URL = "https://secure.api.itau/dda/v1";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getItauAccessToken(credentials: ItauCredentials): Promise<string> {
  // Check cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    scope: "dda-boletos-read",
  });

  try {
    const response = await fetch(ITAU_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    return data.access_token;
  } catch (error) {
    console.error("[Itaú DDA] Authentication error:", error);
    throw new Error("Falha na autenticação com o Itaú. Verifique suas credenciais.");
  }
}

// ==========================================================================
// DDA Boleto Fetching
// ==========================================================================

export async function fetchDDABoletosFromItau(
  credentials: ItauCredentials,
  startDate: Date,
  endDate: Date
): Promise<DDABoletoData[]> {
  const accessToken = await getItauAccessToken(credentials);

  const params = new URLSearchParams({
    cnpj_pagador: credentials.cnpj,
    data_inicio: startDate.toISOString().split("T")[0],
    data_fim: endDate.toISOString().split("T")[0],
    situacao: "PENDENTE",
  });

  try {
    const response = await fetch(
      `${ITAU_DDA_API_URL}/boletos?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "x-itau-correlationID": crypto.randomUUID(),
          "x-itau-flowID": crypto.randomUUID(),
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        cachedToken = null;
        throw new Error("Token expirado. Tentando novamente...");
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.boletos || []).map((boleto: Record<string, string>) => ({
      supplierName: boleto.nome_beneficiario || "Fornecedor não identificado",
      supplierCnpj: boleto.cnpj_beneficiario || "",
      issueDate: new Date(boleto.data_emissao),
      dueDate: new Date(boleto.data_vencimento),
      value: parseFloat(boleto.valor) / 100,
      barcode: boleto.codigo_barras || "",
      digitableLine: boleto.linha_digitavel || "",
      externalId: boleto.id_boleto || boleto.codigo_barras || "",
    }));
  } catch (error) {
    console.error("[Itaú DDA] Error fetching boletos:", error);
    throw error;
  }
}

// ==========================================================================
// CNAB 240 File Parser (Alternative approach)
// ==========================================================================

export function parseCNAB240DDA(fileContent: string): DDABoletoData[] {
  const lines = fileContent.split("\n");
  const boletos: DDABoletoData[] = [];

  for (const line of lines) {
    if (line.length < 240) continue;

    const recordType = line.substring(7, 8);
    const segmentType = line.substring(13, 14);

    // Segment J - Boleto payment details
    if (recordType === "3" && segmentType === "J") {
      try {
        const barcode = line.substring(17, 61).trim();
        const supplierName = line.substring(61, 91).trim();
        const dueDateStr = line.substring(91, 99);
        const valueStr = line.substring(99, 114);
        const supplierCnpj = line.substring(216, 230).trim();

        const dueDate = parseCNABDate(dueDateStr);
        const value = parseInt(valueStr) / 100;

        if (barcode && value > 0) {
          boletos.push({
            supplierName,
            supplierCnpj,
            issueDate: new Date(),
            dueDate,
            value,
            barcode,
            digitableLine: barcodeToDigitableLine(barcode),
            externalId: barcode,
          });
        }
      } catch {
        // Skip malformed lines
      }
    }
  }

  return boletos;
}

function parseCNABDate(dateStr: string): Date {
  const day = parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1;
  const year = parseInt(dateStr.substring(4, 8));
  return new Date(year, month, day);
}

function barcodeToDigitableLine(barcode: string): string {
  if (barcode.length !== 44) return barcode;
  // Simplified conversion - real implementation needs modulo 10/11 calculation
  return `${barcode.substring(0, 5)}.${barcode.substring(5, 10)} ${barcode.substring(10, 15)}.${barcode.substring(15, 21)} ${barcode.substring(21, 26)}.${barcode.substring(26, 32)} ${barcode.substring(32, 33)} ${barcode.substring(33, 44)}`;
}

// ==========================================================================
// Sync Logic - Save to Database
// ==========================================================================

export async function syncBoletosToDatabase(
  companyId: string,
  boletos: DDABoletoData[]
): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const boleto of boletos) {
    // Check if boleto already exists
    const existing = await prisma.dDABoleto.findFirst({
      where: {
        companyId,
        externalId: boleto.externalId,
      },
    });

    if (existing) {
      // Update if value or due date changed
      if (
        Number(existing.value) !== boleto.value ||
        existing.dueDate.getTime() !== boleto.dueDate.getTime()
      ) {
        await prisma.dDABoleto.update({
          where: { id: existing.id },
          data: {
            value: boleto.value,
            dueDate: boleto.dueDate,
            syncedAt: new Date(),
          },
        });
        updated++;
      } else {
        skipped++;
      }
    } else {
      await prisma.dDABoleto.create({
        data: {
          companyId,
          supplierName: boleto.supplierName,
          supplierCnpj: boleto.supplierCnpj,
          issueDate: boleto.issueDate,
          dueDate: boleto.dueDate,
          value: boleto.value,
          barcode: boleto.barcode,
          digitableLine: boleto.digitableLine,
          status: "PENDING",
          bankSource: "itau",
          externalId: boleto.externalId,
          syncedAt: new Date(),
        },
      });
      created++;
    }
  }

  return { created, updated, skipped };
}

// ==========================================================================
// Full Sync Pipeline
// ==========================================================================

export async function performDDASync(
  companyId: string,
  credentials: ItauCredentials
): Promise<{ success: boolean; message: string; details?: Record<string, number> }> {
  try {
    // Fetch last 90 days of boletos
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    console.log(`[Itaú DDA] Starting sync for company ${companyId}`);

    const boletos = await fetchDDABoletosFromItau(credentials, startDate, endDate);

    console.log(`[Itaú DDA] Found ${boletos.length} boletos from Itaú`);

    const result = await syncBoletosToDatabase(companyId, boletos);

    console.log(`[Itaú DDA] Sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`);

    return {
      success: true,
      message: `Sincronização concluída: ${result.created} novos, ${result.updated} atualizados, ${result.skipped} sem alteração.`,
      details: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[Itaú DDA] Sync failed:", message);

    return {
      success: false,
      message: `Erro na sincronização: ${message}`,
    };
  }
}

// ==========================================================================
// Import from CNAB file
// ==========================================================================

export async function importDDAFromCNAB(
  companyId: string,
  fileContent: string
): Promise<{ success: boolean; message: string; details?: Record<string, number> }> {
  try {
    const boletos = parseCNAB240DDA(fileContent);

    if (boletos.length === 0) {
      return {
        success: false,
        message: "Nenhum boleto encontrado no arquivo CNAB.",
      };
    }

    const result = await syncBoletosToDatabase(companyId, boletos);

    return {
      success: true,
      message: `Importação concluída: ${result.created} novos, ${result.updated} atualizados.`,
      details: result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return {
      success: false,
      message: `Erro na importação: ${message}`,
    };
  }
}

// ==========================================================================
// Configuration Management
// ==========================================================================

export async function getItauDDAConfig(companyId: string): Promise<ItauDDAConfig | null> {
  const integration = await prisma.integration.findFirst({
    where: {
      companyId,
      provider: "itau_dda",
      isActive: true,
    },
  });

  if (!integration) return null;

  const config = JSON.parse(integration.config) as Record<string, unknown>;

  return {
    companyId,
    credentials: {
      clientId: (config.clientId as string) || "",
      clientSecret: (config.clientSecret as string) || "",
      certificatePath: (config.certificatePath as string) || "",
      certificatePassword: (config.certificatePassword as string) || "",
      cnpj: (config.cnpj as string) || "",
      agencia: (config.agencia as string) || "",
      conta: (config.conta as string) || "",
    },
    autoSync: (config.autoSync as boolean) || false,
    syncInterval: (config.syncInterval as number) || 60,
  };
}

export async function saveItauDDAConfig(
  companyId: string,
  config: Omit<ItauDDAConfig, "companyId">
): Promise<void> {
  const existing = await prisma.integration.findFirst({
    where: { companyId, provider: "itau_dda" },
  });

  const data = {
    companyId,
    provider: "itau_dda",
    name: "Itaú DDA - Débito Direto Autorizado",
    isActive: true,
    config: JSON.stringify({
      clientId: config.credentials.clientId,
      clientSecret: config.credentials.clientSecret,
      certificatePath: config.credentials.certificatePath,
      certificatePassword: config.credentials.certificatePassword,
      cnpj: config.credentials.cnpj,
      agencia: config.credentials.agencia,
      conta: config.credentials.conta,
      autoSync: config.autoSync,
      syncInterval: config.syncInterval,
    }),
  };

  if (existing) {
    await prisma.integration.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.integration.create({ data });
  }
}
