import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { createProductionOrder } from "@/actions/production";
import { redirect } from "next/navigation";
import { ProductionOrderForm } from "@/components/production/production-order-form";

export default async function NewProductionOrderPage() {
  const companyId = await getActiveCompanyId();

  const [finishedProducts, rawMaterials] = await Promise.all([
    prisma.product.findMany({
      where: { companyId, type: "FINISHED_PRODUCT" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { companyId, type: "RAW_MATERIAL" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  async function handleCreate(formData: FormData) {
    "use server";
    await createProductionOrder(formData);
    redirect("/production/orders");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Nova Ordem de Produção
        </h2>
        <p className="text-muted-foreground">
          Preencha os dados para criar uma nova ordem de produção
        </p>
      </div>

      <ProductionOrderForm
        finishedProducts={finishedProducts}
        rawMaterials={rawMaterials}
        action={handleCreate}
      />
    </div>
  );
}
