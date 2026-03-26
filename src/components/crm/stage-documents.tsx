"use client";

import { FileUploadButton } from "@/components/crm/file-upload-button";
import { FileText, Download, Trash2 } from "lucide-react";

interface DocumentData {
  id: string;
  name: string;
  category: string;
  url: string;
  size: number | null;
}

interface CategoryConfig {
  key: string;
  label: string;
  description: string;
}

// Map stage names to relevant document categories
const stageDocumentCategoriesMap: Record<string, CategoryConfig[]> = {
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

interface StageDocumentsProps {
  stageName: string;
  dealId: string;
  documents?: DocumentData[];
  onDelete?: (documentId: string) => void;
  readOnly?: boolean;
}

export function StageDocuments({ stageName, dealId, documents = [], onDelete, readOnly }: StageDocumentsProps) {
  const categories = stageDocumentCategoriesMap[stageName];
  if (!categories) return null;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Anexos — {stageName}
      </legend>
      {categories.map((cat) => {
        const catDocs = documents.filter((d) => d.category === cat.key);
        return (
          <div key={cat.key} className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold">{cat.label}</h4>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              {!readOnly && <FileUploadButton dealId={dealId} category={cat.key} />}
            </div>
            {catDocs.length > 0 ? (
              <div className="space-y-1.5 mt-2">
                {catDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`${basePath}${doc.url}`} target="_blank" rel="noopener noreferrer" className="text-sm truncate flex-1 hover:underline">{doc.name}</a>
                    {doc.size && <span className="text-xs text-muted-foreground shrink-0">{(doc.size / 1024).toFixed(0)} KB</span>}
                    <a href={`${basePath}${doc.url}`} download={doc.name} className="text-muted-foreground hover:text-foreground"><Download className="h-3.5 w-3.5" /></a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground italic">Nenhum arquivo enviado</p>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}

export function hasStageDocuments(stageName: string): boolean {
  return !!stageDocumentCategoriesMap[stageName];
}
