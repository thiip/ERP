import Link from "next/link";
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
import { getOrganizations } from "@/actions/crm";
import type { Segment } from "@/generated/prisma/client";

const segmentLabels: Record<Segment, string> = {
  SHOPPING: "Shopping",
  PREFEITURA: "Prefeitura",
  CONDOMINIO: "Condomínio",
  EMPRESA: "Empresa",
  OUTRO: "Outro",
};

export default async function OrganizationsPage() {
  const organizations = await getOrganizations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Empresas</h2>
          <p className="text-muted-foreground">
            Gerencie as empresas do CRM
          </p>
        </div>
        <Button render={<Link href="/crm/clients/organizations/new" />}>
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      {organizations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Nenhuma empresa cadastrada.</p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/crm/clients/organizations/new" />}
          >
            <Plus className="h-4 w-4" />
            Criar primeira empresa
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CNPJ</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Data de Último Contato</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => (
              <TableRow key={org.id}>
                <TableCell>{org.cnpj ?? "-"}</TableCell>
                <TableCell className="font-medium">
                  <Link
                    href={`/crm/clients/organizations/${org.id}`}
                    className="text-primary hover:underline"
                  >
                    {org.name}
                  </Link>
                </TableCell>
                <TableCell>{org.responsible?.name ?? "-"}</TableCell>
                <TableCell>{org.city ?? "-"}</TableCell>
                <TableCell>
                  {org.lastContactDate
                    ? new Intl.DateTimeFormat("pt-BR").format(
                        new Date(org.lastContactDate)
                      )
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={
                      <Link href={`/crm/clients/organizations/${org.id}`} />
                    }
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
