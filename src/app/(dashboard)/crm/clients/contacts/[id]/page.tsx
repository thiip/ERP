import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
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
import { getContact, deleteContact } from "@/actions/crm";
import { redirect } from "next/navigation";
import type { DealStage } from "@/generated/prisma/client";

const stageLabels: Record<DealStage, string> = {
  CONTACT_CAPTURE: "Captação",
  BRIEFING: "Briefing",
  PROJECT: "Projeto",
  PRESENTATION: "Apresentação",
  CLOSING: "Fechamento",
  CLOSED_WON: "Ganho",
  CLOSED_LOST: "Perdido",
};

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const { id } = await params;

  let contact;
  try {
    contact = await getContact(id);
  } catch {
    notFound();
  }

  async function handleDelete() {
    "use server";
    await deleteContact(id);
    redirect("/crm/clients/contacts");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/crm/clients/contacts" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{contact.name}</h2>
          {contact.isPF && (
            <Badge variant="secondary" className="mt-1">
              Pessoa Física
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Contato</CardTitle>
          <CardAction>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link href={`/crm/clients/contacts/${contact.id}/edit`} />
                }
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
              <form action={handleDelete}>
                <Button variant="destructive" size="sm" type="submit">
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              </form>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Nome</dt>
              <dd className="font-medium">{contact.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd>{contact.email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Telefone</dt>
              <dd>{contact.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Cargo</dt>
              <dd>{contact.position ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Empresa</dt>
              <dd>
                {contact.organization ? (
                  <Link
                    href={`/crm/clients/organizations/${contact.organization.id}`}
                    className="text-primary hover:underline"
                  >
                    {contact.organization.name}
                  </Link>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            {contact.isPF && (
              <div>
                <dt className="text-sm text-muted-foreground">CPF</dt>
                <dd>{contact.cpf ?? "-"}</dd>
              </div>
            )}
            {contact.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted-foreground">Observações</dt>
                <dd className="whitespace-pre-wrap">{contact.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Negócios Associados</h3>

        {contact.deals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum negócio associado a este contato.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contact.deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium">{deal.title}</TableCell>
                  <TableCell>
                    {deal.organization?.name ?? "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {stageLabels[deal.stage]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {deal.value
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(deal.value))
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {new Intl.DateTimeFormat("pt-BR").format(
                      new Date(deal.createdAt)
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
