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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrganization, deleteOrganization } from "@/actions/crm";
import { redirect } from "next/navigation";
import type {
  Segment,
  ContactOrigin,
  OrganizationStatus,
  DealStage,
  ProposalStatus,
} from "@/generated/prisma/client";

const segmentLabels: Record<Segment, string> = {
  SHOPPING: "Shopping",
  PREFEITURA: "Prefeitura",
  CONDOMINIO: "Condomínio",
  EMPRESA: "Empresa",
  OUTRO: "Outro",
};

const originLabels: Record<ContactOrigin, string> = {
  INDICACAO: "Indicação",
  SITE: "Site",
  REDES_SOCIAIS: "Redes Sociais",
  PROSPECCAO: "Prospecção",
  OUTRO: "Outro",
};

const statusLabels: Record<OrganizationStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  PROSPECT: "Prospecto",
};

const statusVariant: Record<OrganizationStatus, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "outline",
  PROSPECT: "secondary",
};

const stageLabels: Record<DealStage, string> = {
  CONTACT_CAPTURE: "Captação",
  BRIEFING: "Briefing",
  PROJECT: "Projeto",
  PRESENTATION: "Apresentação",
  CLOSING: "Fechamento",
  CLOSED_WON: "Ganho",
  CLOSED_LOST: "Perdido",
};

const proposalStatusLabels: Record<ProposalStatus, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviada",
  ACCEPTED: "Aceita",
  REJECTED: "Rejeitada",
};

interface OrganizationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationDetailPage({
  params,
}: OrganizationDetailPageProps) {
  const { id } = await params;

  let org;
  try {
    org = await getOrganization(id);
  } catch {
    notFound();
  }

  async function handleDelete() {
    "use server";
    await deleteOrganization(id);
    redirect("/crm/clients/organizations");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/crm/clients/organizations" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{org.name}</h2>
            <Badge variant={statusVariant[org.status]}>
              {statusLabels[org.status]}
            </Badge>
          </div>
          {org.cnpj && (
            <p className="text-sm text-muted-foreground">CNPJ: {org.cnpj}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/crm/clients/organizations/${org.id}/edit`} />
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
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Organization Data */}
        <div className="lg:col-span-1 space-y-6">
          {/* Dados Básicos */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Básicos</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Nome Fantasia</dt>
                  <dd className="font-medium">{org.name}</dd>
                </div>
                {org.legalName && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Razão Social</dt>
                    <dd>{org.legalName}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground">CNPJ</dt>
                  <dd>{org.cnpj ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Segmento</dt>
                  <dd>{segmentLabels[org.segment]}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Origem</dt>
                  <dd>{originLabels[org.origin]}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Responsável</dt>
                  <dd>{org.responsible?.name ?? "-"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Localização */}
          <Card>
            <CardHeader>
              <CardTitle>Localização</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Endereço</dt>
                  <dd>{org.address ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Bairro</dt>
                  <dd>{org.neighborhood ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Cidade</dt>
                  <dd>{org.city ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Estado</dt>
                  <dd>{org.state ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">CEP</dt>
                  <dd>{org.zipCode ?? "-"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Outras Informações */}
          <Card>
            <CardHeader>
              <CardTitle>Outras Informações</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-muted-foreground">Telefone</dt>
                  <dd>{org.phone ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Email</dt>
                  <dd>{org.email ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Website</dt>
                  <dd>{org.website ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Último Contato
                  </dt>
                  <dd>
                    {org.lastContactDate
                      ? new Intl.DateTimeFormat("pt-BR").format(
                          new Date(org.lastContactDate)
                        )
                      : "-"}
                  </dd>
                </div>
                {org.notes && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Observações</dt>
                    <dd className="whitespace-pre-wrap">{org.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="pessoas">
            <TabsList>
              <TabsTrigger value="pessoas">
                Pessoas ({org.contacts.length})
              </TabsTrigger>
              <TabsTrigger value="projetos">
                Projetos ({org.deals.length})
              </TabsTrigger>
              <TabsTrigger value="propostas">
                Propostas ({org.proposals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pessoas" className="mt-4">
              {org.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum contato vinculado a esta empresa.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {org.contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/crm/clients/contacts/${contact.id}`}
                            className="text-primary hover:underline"
                          >
                            {contact.name}
                          </Link>
                        </TableCell>
                        <TableCell>{contact.position ?? "-"}</TableCell>
                        <TableCell>{contact.phone ?? "-"}</TableCell>
                        <TableCell>{contact.email ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="projetos" className="mt-4">
              {org.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum projeto vinculado a esta empresa.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Responsável</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {org.deals.map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell className="font-medium">
                          {deal.title}
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
                          {deal.assignedTo?.name ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="propostas" className="mt-4">
              {org.proposals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma proposta vinculada a esta empresa.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Negócio</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {org.proposals.map((proposal) => (
                      <TableRow key={proposal.id}>
                        <TableCell className="font-medium">
                          {proposal.number}
                        </TableCell>
                        <TableCell>
                          {proposal.deal?.title ?? "-"}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(Number(proposal.totalValue))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {proposalStatusLabels[proposal.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
