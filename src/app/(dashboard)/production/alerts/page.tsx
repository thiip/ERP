import { getAlerts, resolveAlert } from "@/actions/production";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import type { AlertType } from "@/generated/prisma/client";

const alertTypeLabel: Record<AlertType, string> = {
  LOW_STOCK: "Estoque Baixo",
  OUT_OF_STOCK: "Sem Estoque",
  REORDER_TRIGGERED: "Reposição Automática",
};

const alertTypeClassName: Record<AlertType, string> = {
  LOW_STOCK: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  OUT_OF_STOCK: "bg-red-500/10 text-red-800 hover:bg-red-500/10",
  REORDER_TRIGGERED: "bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/10",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function AlertsPage() {
  const alerts = await getAlerts();

  async function handleResolve(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await resolveAlert(id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Alertas de Material
        </h2>
        <p className="text-muted-foreground">
          Alertas sobre estoque insuficiente e reposições automáticas
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Nenhum alerta pendente de resolução.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <CardTitle className="text-base">{alert.product.name}</CardTitle>
                <Badge
                  variant="outline"
                  className={alertTypeClassName[alert.type]}
                >
                  {alertTypeLabel[alert.type]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {alert.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  Criado em {formatDate(alert.createdAt)}
                </p>
                <form action={handleResolve}>
                  <input type="hidden" name="id" value={alert.id} />
                  <Button type="submit" variant="outline" size="sm">
                    <CheckCircle className="h-4 w-4" />
                    Resolver
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
