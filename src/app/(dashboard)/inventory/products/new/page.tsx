import { createProduct } from "@/actions/inventory";
import { redirect } from "next/navigation";
import { ProductForm } from "@/components/inventory/product-form";

export default function NewProductPage() {
  async function handleCreate(formData: FormData) {
    "use server";
    await createProduct(formData);
    redirect("/inventory/products");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Novo Produto</h2>
        <p className="text-muted-foreground">
          Cadastre um novo produto ou matéria-prima
        </p>
      </div>

      <ProductForm action={handleCreate} />
    </div>
  );
}
