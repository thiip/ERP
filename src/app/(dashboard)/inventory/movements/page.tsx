import { getMovements } from "@/actions/inventory";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MovementType } from "@/generated/prisma/client";

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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export default async function MovementsPage() {
  const movements = await getMovements();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Movimentações de Estoque
        </h2>
        <p className="text-muted-foreground">
          Histórico de entradas, saídas e ajustes de estoque
        </p>
      </div>

      {movements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Nenhuma movimentação registrada.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Estoque Anterior</TableHead>
              <TableHead className="text-right">Novo Estoque</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="font-medium">
                  {movement.product?.name ?? "-"}
                </TableCell>
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
  );
}
