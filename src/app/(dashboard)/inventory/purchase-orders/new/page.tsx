import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { createPurchaseOrder } from "@/actions/inventory";
import { redirect } from "next/navigation";
import { PurchaseOrderForm } from "@/components/inventory/purchase-order-form";

export default async function NewPurchaseOrderPage() {
  const activeCompanyId = await getActiveCompanyId();

  const products = await prisma.product.findMany({
    where: {
      companyId: activeCompanyId,
      type: "RAW_MATERIAL",
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  async function handleCreate(formData: FormData) {
    "use server";
    await createPurchaseOrder(formData);
    redirect("/inventory/purchase-orders");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Nova Ordem de Compra
        </h2>
        <p className="text-muted-foreground">
          Crie uma nova ordem de compra para fornecedores
        </p>
      </div>

      <PurchaseOrderForm products={products} action={handleCreate} />
    </div>
  );
}
