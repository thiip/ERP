import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID || ""}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
  },
};

let msalClient: ConfidentialClientApplication | null = null;

function getMsalClient(): ConfidentialClientApplication {
  if (!msalClient) {
    msalClient = new ConfidentialClientApplication(msalConfig);
  }
  return msalClient;
}

async function getAccessToken(): Promise<string> {
  const client = getMsalClient();
  const result = await client.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });
  if (!result?.accessToken) throw new Error("Failed to acquire access token");
  return result.accessToken;
}

export function getGraphClient(): Client {
  return Client.init({
    authProvider: async (done) => {
      try {
        const token = await getAccessToken();
        done(null, token);
      } catch (err) {
        done(err as Error, null);
      }
    },
  });
}

const DRIVE_ID = process.env.SHAREPOINT_DRIVE_ID || "";
const FILE_ID = process.env.SHAREPOINT_FILE_ID || "";
const WORKSHEET = process.env.SHAREPOINT_WORKSHEET_NAME || "Sheet1";

export async function readExcelWorksheet(
  worksheetName?: string
): Promise<{ values: string[][]; address: string }> {
  const client = getGraphClient();
  const ws = worksheetName || WORKSHEET;
  const result = await client
    .api(`/drives/${DRIVE_ID}/items/${FILE_ID}/workbook/worksheets/${ws}/usedRange`)
    .get();
  return { values: result.values || [], address: result.address || "" };
}

export async function writeExcelRange(
  range: string,
  values: (string | number | null)[][],
  worksheetName?: string
): Promise<void> {
  const client = getGraphClient();
  const ws = worksheetName || WORKSHEET;
  await client
    .api(`/drives/${DRIVE_ID}/items/${FILE_ID}/workbook/worksheets/${ws}/range(address='${range}')`)
    .patch({ values });
}

export async function appendExcelRows(
  values: (string | number | null)[][],
  worksheetName?: string
): Promise<void> {
  const client = getGraphClient();
  const ws = worksheetName || WORKSHEET;
  // Get current used range to find next row
  const usedRange = await client
    .api(`/drives/${DRIVE_ID}/items/${FILE_ID}/workbook/worksheets/${ws}/usedRange`)
    .select("rowCount,address")
    .get();
  const nextRow = (usedRange.rowCount || 1) + 1;
  const lastCol = String.fromCharCode(64 + (values[0]?.length || 1));
  const endRow = nextRow + values.length - 1;
  const range = `A${nextRow}:${lastCol}${endRow}`;
  await writeExcelRange(range, values, ws);
}

export async function createExcelSession(): Promise<string> {
  const client = getGraphClient();
  const result = await client
    .api(`/drives/${DRIVE_ID}/items/${FILE_ID}/workbook/createSession`)
    .post({ persistChanges: true });
  return result.id;
}

export async function closeExcelSession(sessionId: string): Promise<void> {
  const client = getGraphClient();
  await client
    .api(`/drives/${DRIVE_ID}/items/${FILE_ID}/workbook/closeSession`)
    .header("workbook-session-id", sessionId)
    .post({});
}

export function isGraphConfigured(): boolean {
  return !!(
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_TENANT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.SHAREPOINT_DRIVE_ID &&
    process.env.SHAREPOINT_FILE_ID
  );
}
