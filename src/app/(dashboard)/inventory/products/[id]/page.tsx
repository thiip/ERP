import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MovementForm } from "@/components/inventory/movement-form";
import type { ProductType, MovementType } from "@/generated/prisma/client";

const typeLabel: Record<ProductType, string> = {
  FINISHED_PRODUCT: "Produto Acabado",
  RAW_MATERIAL: "Matéria-Prima",
};

const typeVariant: Record<ProductType, "default" | "secondary"> = {
  FINISHED_PRODUCT: "default",
  RAW_MATERIAL: "secondary",
};

const movementTypeLabel: Record<MovementType, string> = {
  IN: "Entrada",
  OUT: "Saída",
  ADJUSTMENT: "Ajuste",
  PRODUCTION_CONSUME: "Consumo Produção",
  PRODUCTION_OUTPUT: "Saída Produção",
};

const movementTypeVariant: Record<
  MovementType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  IN: "default",
  OUT: "destructive",
  ADJUSTMENT: "secondary",
  PRODUCTION_CONSUME: "secondary",
  PRODUCTION_OUTPUT: "default",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;
  const activeCompanyId = await getActiveCompanyId();

  const product = await prisma.product.findFirst({
    where: {
      id,
      companyId: activeCompanyId,
    },
    include: {
      movements: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const stockStatus =
    Number(product.currentStock) < Number(product.minimumStock)
      ? "Estoque Baixo"
      : Number(product.currentStock) <= Number(product.reorderPoint)
        ? "Ponto de Reposição"
        : "Normal";

  const stockStatusColor =
    Number(product.currentStock) < Number(product.minimumStock)
      ? "text-red-500"
      : Number(product.currentStock) <= Number(product.reorderPoint)
        ? "text-yellow-500"
        : "text-green-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/inventory/products" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">{product.name}</h2>
        <Badge variant={typeVariant[product.type]}>
          {typeLabel[product.type]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Nome</dt>
                <dd className="font-medium">{product.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">SKU</dt>
                <dd>{product.sku ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Tipo</dt>
                <dd>
                  <Badge variant={typeVariant[product.type]}>
                    {typeLabel[product.type]}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Unidade</dt>
                <dd>{product.unit}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Preço de Custo</dt>
                <dd>{formatCurrency(Number(product.costPrice ?? 0))}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  Preço de Venda
                </dt>
                <dd>{formatCurrency(Number(product.salePrice ?? 0))}</dd>
              </div>
              {product.description && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Descrição</dt>
                  <dd className="whitespace-pre-wrap">
                    {product.description}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estoque</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Estoque Atual</dt>
                <dd className="text-2xl font-bold">{Number(product.currentStock)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  Estoque Mínimo
                </dt>
                <dd className="text-2xl font-bold">{Number(product.minimumStock)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">
                  Ponto de Reposição
                </dt>
                <dd className="text-2xl font-bold">{Number(product.reorderPoint)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd className={`text-lg font-semibold ${stockStatusColor}`}>
                  {stockStatus}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Registrar Movimentação</CardTitle>
        </CardHeader>
        <CardContent>
          <MovementForm productId={product.id} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Últimas Movimentações</h3>

        {product.movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma movimentação registrada.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Estoque Anterior</TableHead>
                <TableHead className="text-right">Novo Estoque</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    <Badge variant={movementTypeVariant[movement.type]}>
                      {movementTypeLabel[movement.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(movement.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(movement.previousStock)}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(movement.newStock)}
                  </TableCell>
                  <TableCell>{movement.user?.name ?? "-"}</TableCell>
                  <TableCell>{formatDate(movement.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
