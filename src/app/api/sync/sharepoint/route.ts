import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fullBidirectionalSync } from "@/lib/sharepoint-sync";
import { isGraphConfigured } from "@/lib/microsoft-graph";

export async function POST(request: NextRequest) {
  try {
    // Validate secret token
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || request.headers.get("x-sync-token");
    const syncSecret = process.env.SYNC_SECRET || "projectum-sync-2026";

    if (token !== syncSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isGraphConfigured()) {
      return NextResponse.json({ error: "SharePoint not configured" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const month = body.month || new Date().getMonth() + 1;
    const year = body.year || new Date().getFullYear();

    // Get all companies (or specific one)
    const companies = body.companyId
      ? [{ id: body.companyId }]
      : await prisma.company.findMany({ select: { id: true } });

    const results = [];
    for (const company of companies) {
      try {
        const result = await fullBidirectionalSync(company.id, month, year);
        results.push({ companyId: company.id, ...result });
      } catch (err: any) {
        results.push({ companyId: company.id, error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    configured: isGraphConfigured(),
    message: "Use POST to trigger sync",
  });
}
