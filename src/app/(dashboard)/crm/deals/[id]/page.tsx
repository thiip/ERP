import Link from "next/link";
import { getDeal, advanceDealStage, closeDeal, deleteDealDocument, getStageFields, getDealFieldValues, moveDealToStage } from "@/actions/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FollowUpForm } from "@/components/crm/follow-up-form";
import { FileUploadButton } from "@/components/crm/file-upload-button";
import {
  Phone, Mail, Building2, User, DollarSign, XCircle,
  ArrowRightLeft, CheckCircle2, Clock, ArrowRight, ArrowLeft,
  MapPin, Truck, Calendar, Compass, Trash2, Download,
  AlertTriangle,
} from "lucide-react";
import { redirect } from "next/navigation";
import type { FollowUpType, DealDocumentCategory } from "@/generated/prisma/client";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Map stage names to relevant document categories for inline uploads
const stageDocumentCategories: Record<string, { key: DealDocumentCategory; label: string; description: string }[]> = {
  "Briefing": [
    { key: "PLANTA_BAIXA", label: "Planta Baixa", description: "Plantas baixas e layouts do espaço" },
    { key: "FOTOS_LOCAIS", label: "Fotos dos Locais", description: "Fotos dos locais e espaços do projeto" },
  ],
  "Projetos": [
    { key: "ANEXOS_PROJETO", label: "Anexos do Projeto", description: "Renders, vistas 3D e arquivos do projeto" },
    { key: "FOTOS_PROJETO", label: "Fotos do Projeto", description: "Fotos de referência e do projeto executado" },
  ],
  "Apresentação": [
    { key: "PROPOSTA", label: "Proposta", description: "Propostas comerciais e orçamentos" },
  ],
  "Apresentação/Orçamento": [
    { key: "PROPOSTA", label: "Proposta", description: "Propostas comerciais e orçamentos" },
  ],
};

const followUpTypeLabel: Record<FollowUpType, string> = {
  CALL: "Ligação",
  EMAIL: "E-mail",
  MEETING: "Reunião",
  WHATSAPP: "WhatsApp",
  NOTE: "Nota",
};

function formatCurrency(value: unknown): string {
  const num = Number(value);
  if (!value || isNaN(num)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));
}

function formatFieldValue(value: string, fieldType: string): string {
  if (!value) return "-";
  if (fieldType === "CURRENCY") {
    const num = Number(value);
    return isNaN(num) ? value : formatCurrency(num);
  }
  if (fieldType === "DATE") {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
  }
  return value;
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await getDeal(id);

  // Get pipeline stages for dynamic progress bar
  let pipelineStages: { id: string; name: string; order: number }[] = [];
  if (deal.pipelineId) {
    pipelineStages = await prisma.pipelineStage.findMany({
      where: { pipelineId: deal.pipelineId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, order: true },
    });
  }

  // Get stage fields and values for current stage
  let currentStageFields: any[] = [];
  let fieldValues: Record<string, string> = {};
  if (deal.pipelineStageId) {
    const [sf, fv] = await Promise.all([
      getStageFields(deal.pipelineStageId),
      getDealFieldValues(deal.id),
    ]);
    currentStageFields = sf.fields;
    fieldValues = fv;
  }

  const currentStageIdx = pipelineStages.findIndex((s) => s.id === deal.pipelineStageId);
  const isClosed = deal.closedStatus === "WON" || deal.closedStatus === "LOST" ||
                   deal.stage === "CLOSED_WON" || deal.stage === "CLOSED_LOST";
  // "Fechamento" is the last stage. Show "Ganhar" button when at Apresentação or Fechamento
  const isAtOrPastPresentation = currentStageIdx >= pipelineStages.length - 2 && currentStageIdx >= 0;

  async function handleAdvanceStage() {
    "use server";
    const result = await advanceDealStage(id);
    if (result && !result.success) {
      redirect(`/crm/deals/${id}?error=${encodeURIComponent(result.error || "Erro ao avançar etapa")}`);
    }
    redirect(`/crm/deals/${id}`);
  }

  async function handleMarkWon() {
    "use server";
    await closeDeal(id, "WON");
    redirect(`/crm/deals/${id}`);
  }

  async function handleMarkLost() {
    "use server";
    await closeDeal(id, "LOST");
    redirect(`/crm/deals/${id}`);
  }

  async function handleDeleteDocument(documentId: string) {
    "use server";
    await deleteDealDocument(documentId);
    redirect(`/crm/deals/${id}`);
  }

  async function handleMoveToStage(formData: FormData) {
    "use server";
    const targetStageId = formData.get("stageId") as string;
    if (targetStageId) await moveDealToStage(id, targetStageId);
    redirect(`/crm/deals/${id}`);
  }

  const prevStage = currentStageIdx > 0 ? pipelineStages[currentStageIdx - 1] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{deal.title}</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {deal.organization && (
              <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{deal.organization.name}</span>
            )}
            {deal.value && (
              <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{formatCurrency(deal.value)}</span>
            )}
            {deal.contact && (
              <span className="flex items-center gap-1"><User className="h-4 w-4" />{deal.contact.name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isClosed && (
            <>
              {prevStage && (
                <form action={handleMoveToStage}>
                  <input type="hidden" name="stageId" value={prevStage.id} />
                  <Button variant="outline" size="sm" type="submit">
                    <ArrowLeft className="h-4 w-4" />Voltar etapa
                  </Button>
                </form>
              )}
              {isAtOrPastPresentation ? (
                <form action={handleMarkWon}>
                  <Button size="sm" type="submit"><CheckCircle2 className="h-4 w-4" />Ganhar negócio</Button>
                </form>
              ) : (
                <form action={handleAdvanceStage}>
                  <Button size="sm" type="submit"><ArrowRight className="h-4 w-4" />Avançar etapa</Button>
                </form>
              )}
              <form action={handleMarkLost}>
                <Button variant="destructive" size="sm" type="submit"><XCircle className="h-4 w-4" />Perder</Button>
              </form>
              <Button variant="outline" size="sm" render={<Link href={`/crm/deals/${id}/edit`} />}>
                <ArrowRightLeft className="h-4 w-4" />Editar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Stage progress bar — clickable */}
      {pipelineStages.length > 0 && (
        <div className="flex gap-1">
          {pipelineStages.map((stage, idx) => {
            const isActive = stage.id === deal.pipelineStageId;
            const isPast = idx < currentStageIdx && !isClosed;
            const isWon = isClosed && (deal.closedStatus === "WON" || deal.stage === "CLOSED_WON");
            const isLost = isClosed && (deal.closedStatus === "LOST" || deal.stage === "CLOSED_LOST");

            let bgClass = "bg-muted";
            if (isWon) bgClass = "bg-green-500/100";
            else if (isLost) bgClass = "bg-red-500/100";
            else if (isActive) bgClass = "bg-primary";
            else if (isPast) bgClass = "bg-primary/60";

            const isClickable = !isClosed && !isActive;

            return (
              <div key={stage.id} className="flex-1 space-y-1">
                {isClickable ? (
                  <form action={handleMoveToStage}>
                    <input type="hidden" name="stageId" value={stage.id} />
                    <button
                      type="submit"
                      className={`w-full h-2 rounded-full ${bgClass} hover:opacity-80 transition-opacity cursor-pointer`}
                      title={`Mover para ${stage.name}`}
                    />
                  </form>
                ) : (
                  <div className={`h-2 rounded-full ${bgClass}`} />
                )}
                <p className={`text-center text-xs ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {stage.name}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {isClosed && (
        <Badge variant={(deal.closedStatus === "WON" || deal.stage === "CLOSED_WON") ? "default" : "destructive"}>
          {(deal.closedStatus === "WON" || deal.stage === "CLOSED_WON") ? "Ganho" : "Perdido"}
        </Badge>
      )}

      <Separator />

      {/* Main content: 2 columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left side */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Informações Essenciais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="Cliente" value={deal.organization?.name} />
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="CNPJ" value={deal.organization?.cnpj} />
              <InfoRow icon={<User className="h-4 w-4" />} label="Contato" value={deal.contact?.name} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={deal.contact?.phone} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={deal.contact?.email} />
              <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Valor" value={formatCurrency(deal.value)} />
            </CardContent>
          </Card>

          {/* Stage Fields */}
          {currentStageFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {deal.pipelineStage?.name || "Campos da Etapa"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentStageFields.map((field: any) => (
                  <InfoRow
                    key={field.id}
                    label={field.label}
                    value={fieldValues[field.id] ? formatFieldValue(fieldValues[field.id], field.fieldType) : undefined}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Stage-specific document uploads */}
          {deal.pipelineStage?.name && stageDocumentCategories[deal.pipelineStage.name] && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Anexos — {deal.pipelineStage.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stageDocumentCategories[deal.pipelineStage.name].map((cat) => {
                  const catDocs = deal.documents.filter((d) => d.category === cat.key);
                  return (
                    <div key={cat.key} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-semibold">{cat.label}</h4>
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        </div>
                        {!isClosed && <FileUploadButton dealId={deal.id} category={cat.key} />}
                      </div>
                      {catDocs.length > 0 ? (
                        <div className="space-y-1.5 mt-2">
                          {catDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <a href={`${BASE_PATH}${doc.url}`} target="_blank" rel="noopener noreferrer" className="text-sm truncate flex-1 hover:underline">{doc.name}</a>
                              {doc.size && <span className="text-xs text-muted-foreground shrink-0">{(doc.size / 1024).toFixed(0)} KB</span>}
                              <a href={`${BASE_PATH}${doc.url}`} download={doc.name} className="text-muted-foreground hover:text-foreground"><Download className="h-3.5 w-3.5" /></a>
                              {!isClosed && (
                                <form action={handleDeleteDocument.bind(null, doc.id)}>
                                  <button type="submit" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                                </form>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground italic">Nenhum arquivo</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Outras Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow icon={<User className="h-4 w-4" />} label="Responsável" value={deal.assignedTo?.name} />
              <InfoRow icon={<Compass className="h-4 w-4" />} label="Origem" value={deal.origin} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Endereço" value={deal.address} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Data de Início" value={deal.startDate ? formatDate(deal.startDate) : null} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Previsão de Fechamento" value={deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : null} />
              {deal.decorationTheme && <InfoRow label="Tema da Decoração" value={deal.decorationTheme} />}
            </CardContent>
          </Card>
        </div>

        {/* Right side: tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline">
            <TabsList>
              <TabsTrigger value="timeline">Linha do tempo</TabsTrigger>
              <TabsTrigger value="proposals">Propostas</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4 mt-4">
              {!isClosed && <FollowUpForm dealId={deal.id} />}
              <Separator />
              {deal.followUps.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
              ) : (
                <div className="space-y-3">
                  {deal.followUps.map((fu) => (
                    <div key={fu.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="mt-0.5">
                        {fu.completedAt ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{followUpTypeLabel[fu.type]}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(fu.createdAt)}</span>
                        </div>
                        {fu.description && <p className="text-sm">{fu.description}</p>}
                        <p className="text-xs text-muted-foreground">
                          {fu.user.name}
                          {fu.scheduledAt && <> &middot; Agendado: {formatDate(fu.scheduledAt)}</>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="proposals" className="mt-4">
              {deal.proposals.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma proposta cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {deal.proposals.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Proposta #{p.number} (Rev. {p.revision})</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(p.totalValue)} &middot; {formatDate(p.createdAt)}</p>
                      </div>
                      <Badge variant={p.status === "ACCEPTED" ? "default" : p.status === "REJECTED" ? "destructive" : "secondary"}>
                        {p.status === "DRAFT" ? "Rascunho" : p.status === "SENT" ? "Enviada" : p.status === "ACCEPTED" ? "Aceita" : "Rejeitada"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <DocumentsSection documents={deal.documents} dealId={deal.id} onDelete={handleDeleteDocument} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

const documentCategoryConfig: { key: DealDocumentCategory; label: string; description: string }[] = [
  { key: "PLANTA_BAIXA", label: "Planta Baixa", description: "Plantas baixas e layouts do espaço" },
  { key: "FOTOS_LOCAIS", label: "Fotos dos Locais", description: "Fotos dos locais e espaços do projeto" },
  { key: "ANEXOS_PROJETO", label: "Anexos do Projeto", description: "Renders, vistas 3D e arquivos do projeto" },
  { key: "FOTOS_PROJETO", label: "Fotos do Projeto", description: "Fotos de referência e do projeto executado" },
  { key: "PROPOSTA", label: "Proposta", description: "Propostas comerciais e orçamentos" },
  { key: "OUTRO", label: "Outros", description: "Outros documentos e anexos" },
];

function DocumentsSection({
  documents, dealId, onDelete,
}: {
  documents: { id: string; name: string; category: DealDocumentCategory; url: string; size: number | null; createdAt: Date }[];
  dealId: string;
  onDelete: (documentId: string) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      {documentCategoryConfig.map((cat) => {
        const catDocs = documents.filter((d) => d.category === cat.key);
        return (
          <div key={cat.key} className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold">{cat.label}</h4>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              <FileUploadButton dealId={dealId} category={cat.key} />
            </div>
            {catDocs.length > 0 ? (
              <div className="space-y-1.5 mt-3">
                {catDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`${BASE_PATH}${doc.url}`} target="_blank" rel="noopener noreferrer" className="text-sm truncate flex-1 hover:underline">{doc.name}</a>
                    {doc.size && <span className="text-xs text-muted-foreground shrink-0">{(doc.size / 1024).toFixed(0)} KB</span>}
                    <a href={`${BASE_PATH}${doc.url}`} download={doc.name} className="text-muted-foreground hover:text-foreground"><Download className="h-3.5 w-3.5" /></a>
                    <form action={onDelete.bind(null, doc.id)}>
                      <button type="submit" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground italic">Nenhum arquivo</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({ icon, label, value, highlight }: {
  icon?: React.ReactNode; label: string; value: string | null | undefined; highlight?: boolean;
}) {
  return (
    <div className={`flex items-start gap-2 ${highlight ? "text-yellow-600" : ""}`}>
      {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
      {highlight && !icon && <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500" />}
      <div>
        <p className="text-xs text-muted-foreground">{label}{highlight ? " *" : ""}</p>
        <p className="text-sm">{value || "-"}</p>
      </div>
    </div>
  );
}
