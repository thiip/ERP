import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { DealDocumentCategory } from "@/generated/prisma/client";

const VALID_CATEGORIES: DealDocumentCategory[] = [
  "PLANTA_BAIXA",
  "FOTOS_LOCAIS",
  "ANEXOS_PROJETO",
  "FOTOS_PROJETO",
  "PROPOSTA",
  "OUTRO",
];

export async function POST(request: NextRequest) {
  try {
    const companyId = await getActiveCompanyId();
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const dealId = formData.get("dealId") as string | null;
    const category = formData.get("category") as DealDocumentCategory | null;

    if (!file || !dealId || !category) {
      return NextResponse.json(
        { error: "file, dealId e category são obrigatórios" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Categoria inválida" },
        { status: 400 }
      );
    }

    // Verify deal belongs to company
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, companyId },
    });
    if (!deal) {
      return NextResponse.json(
        { error: "Negócio não encontrado" },
        { status: 404 }
      );
    }

    // Save file to disk
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${timestamp}-${safeName}`;
    const dirPath = join(
      process.cwd(),
      "public",
      "uploads",
      "deals",
      dealId,
      category
    );
    await mkdir(dirPath, { recursive: true });

    const filePath = join(dirPath, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const url = `/uploads/deals/${dealId}/${category}/${fileName}`;

    // Create database record
    const document = await prisma.dealDocument.create({
      data: {
        dealId,
        name: file.name,
        category,
        url,
        size: file.size,
        mimeType: file.type || null,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload" },
      { status: 500 }
    );
  }
}
