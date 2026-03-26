import Link from "next/link";
import { getProducts } from "@/actions/inventory";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProductType } from "@/generated/prisma/client";

const typeLabel: Record<ProductType, string> = {
  FINISHED_PRODUCT: "Produto Acabado",
  RAW_MATERIAL: "Matéria-Prima",
};

const typeVariant: Record<ProductType, "default" | "secondary"> = {
  FINISHED_PRODUCT: "default",
  RAW_MATERIAL: "secondary",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Produtos e Materiais
          </h2>
          <p className="text-muted-foreground">
            Gerencie o catálogo de produtos e matérias-primas
          </p>
        </div>
        <Button render={<Link href="/inventory/products/new" />}>
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Nenhum produto cadastrado.</p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/inventory/products/new" />}
          >
            <Plus className="h-4 w-4" />
            Criar primeiro produto
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Estoque Atual</TableHead>
              <TableHead className="text-right">Estoque Mínimo</TableHead>
              <TableHead className="text-right">Preço Custo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const isLowStock = Number(product.currentStock) < Number(product.minimumStock);
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={typeVariant[product.type]}>
                      {typeLabel[product.type]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right ${isLowStock ? "text-red-500 font-semibold" : ""}`}
                  >
                    {Number(product.currentStock)}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(product.minimumStock)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(product.costPrice ?? 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      render={
                        <Link href={`/inventory/products/${product.id}`} />
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
