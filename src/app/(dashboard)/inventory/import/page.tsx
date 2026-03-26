"use client";

import { useState, useTransition } from "react";
import { importProducts } from "@/actions/inventory";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react";

type ParsedRow = {
  name: string;
  sku: string;
  description: string;
  unit: string;
  minStock: string;
  costPrice: string;
  sellPrice: string;
};

export default function ImportProductsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setSuccess("");
    setParsedData([]);
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith(".csv")) {
      setError("Apenas arquivos CSV são aceitos.");
      return;
    }

    setFile(selected);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        setError("O arquivo deve conter ao menos o cabeçalho e uma linha de dados.");
        return;
      }

      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(";").map((c) => c.trim());
        if (cols.length < 2) continue;
        rows.push({
          name: cols[0] || "",
          sku: cols[1] || "",
          description: cols[2] || "",
          unit: cols[3] || "UN",
          minStock: cols[4] || "0",
          costPrice: cols[5] || "0",
          sellPrice: cols[6] || "0",
        });
      }

      if (rows.length === 0) {
        setError("Nenhum dado válido encontrado no arquivo.");
        return;
      }

      setParsedData(rows);
    };
    reader.readAsText(selected);
  }

  async function handleImport() {
    if (!file) return;

    startTransition(async () => {
      try {
        // Read file as text and send the CSV string to the server action
        const text = await file.text();
        await importProducts(text);
        setSuccess(`${parsedData.length} produto(s) importado(s) com sucesso!`);
        setParsedData([]);
        setFile(null);
      } catch {
        setError("Erro ao importar produtos. Verifique o arquivo e tente novamente.");
      }
    });
  }

  function clearFile() {
    setFile(null);
    setParsedData([]);
    setError("");
    setSuccess("");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Importar produtos</h1>

      {/* Instructions */}
      <div className="rounded-xl border border-foreground/[0.08] bg-emerald-500/10 p-5 mb-6">
        <h2 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Formato do arquivo CSV
        </h2>
        <p className="text-sm text-emerald-400 mb-3">
          O arquivo deve ser um CSV separado por ponto e vírgula (;) com as seguintes colunas:
        </p>
        <div className="bg-card rounded-lg border border-emerald-500/20 p-3 font-mono text-xs text-foreground/70">
          Nome;SKU;Descrição;Unidade;Estoque mínimo;Preço de custo;Preço de venda
        </div>
        <p className="text-xs text-emerald-600 mt-2">
          A primeira linha deve conter o cabeçalho. Campos numéricos devem usar ponto como separador decimal.
        </p>
      </div>

      {/* Success */}
      {success && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 mb-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-400">{success}</span>
          <button onClick={() => setSuccess("")} className="ml-auto text-green-400 hover:text-green-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-400">{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Upload Area */}
      <div className="rounded-xl glass-card p-5 shadow-sm mb-6">
        {!file ? (
          <label className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-foreground/10 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-500/10/30 transition-all">
            <Upload className="h-10 w-10 text-foreground/40 mb-3" />
            <span className="text-sm font-medium text-foreground/60">
              Clique para selecionar ou arraste um arquivo CSV
            </span>
            <span className="text-xs text-foreground/40 mt-1">Apenas arquivos .csv</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-foreground/50">
                {parsedData.length} linha(s) encontrada(s)
              </p>
            </div>
            <button
              onClick={clearFile}
              className="text-sm text-foreground/50 hover:text-red-600 px-3 py-1 rounded hover:bg-red-500/10 transition-colors"
            >
              Remover
            </button>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {parsedData.length > 0 && (
        <>
          <h2 className="text-base font-semibold mb-3">Pré-visualização ({parsedData.length} produtos)</h2>
          <div className="rounded-xl glass-card-elevated overflow-hidden mb-6">
            <div className="max-h-96 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Unidade</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Est. mín.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Custo</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.04]">
                  {parsedData.map((row, i) => (
                    <tr key={i} className="hover:bg-foreground/[0.02] transition-colors">
                      <td className="px-4 py-2 text-xs text-foreground/40">{i + 1}</td>
                      <td className="px-4 py-2 text-sm font-medium">{row.name}</td>
                      <td className="px-4 py-2 text-sm font-mono text-foreground/60">{row.sku}</td>
                      <td className="px-4 py-2 text-sm text-foreground/60 max-w-xs truncate">{row.description || "-"}</td>
                      <td className="px-4 py-2 text-sm text-foreground/60">{row.unit}</td>
                      <td className="px-4 py-2 text-sm text-right">{row.minStock}</td>
                      <td className="px-4 py-2 text-sm text-right">{row.costPrice}</td>
                      <td className="px-4 py-2 text-sm text-right">{row.sellPrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Upload className="h-4 w-4" />
              {isPending ? "Importando..." : `Importar ${parsedData.length} produto(s)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
