"use client";

import { useEffect, useState, useTransition } from "react";
import { getMaterialRequisitions, approveMaterialRequisition, cancelMaterialRequisition } from "@/actions/inventory";
import { Plus, FileText, Check, X } from "lucide-react";
import Link from "next/link";

type Requisition = {
  id: string;
  requisitionNumber: string;
  description: string | null;
  costCenter: string | null;
  status: string;
  createdAt: string;
  _count?: { items: number };
};

type Tab = "ALL" | "PENDING" | "APPROVED" | "FULFILLED";

const statusLabels: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  FULFILLED: "Atendida",
  CANCELLED: "Cancelada",
  REJECTED: "Rejeitada",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-emerald-500/10 text-emerald-400",
  FULFILLED: "bg-green-100 text-green-400",
  CANCELLED: "bg-foreground/[0.04] text-foreground/50",
  REJECTED: "bg-red-500/10 text-red-400",
};

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [tab, setTab] = useState<Tab>("ALL");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await getMaterialRequisitions();
    setRequisitions(data as unknown as Requisition[]);
  }

  async function handleApprove(id: string) {
    startTransition(async () => {
      await approveMaterialRequisition(id);
      loadData();
    });
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esta requisição?")) return;
    startTransition(async () => {
      await cancelMaterialRequisition(id);
      loadData();
    });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "ALL", label: "Todas" },
    { key: "PENDING", label: "Pendentes" },
    { key: "APPROVED", label: "Aprovadas" },
    { key: "FULFILLED", label: "Atendidas" },
  ];

  const filtered = requisitions.filter((r) => {
    if (tab === "ALL") return true;
    return r.status === tab;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Requisições de material</h1>
        <Link
          href="/inventory/requisitions/new"
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nova requisição
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-foreground/[0.08]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-foreground/50 hover:text-foreground/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Nº</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Descrição</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Centro de Custo</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-foreground/50">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-foreground/30" />
                  Nenhuma requisição encontrada
                </td>
              </tr>
            )}
            {filtered.map((req) => (
              <tr key={req.id} className="hover:bg-foreground/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm font-mono font-medium">{req.requisitionNumber}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">
                  {new Date(req.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-sm">{req.description}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">{req.costCenter || "-"}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusColors[req.status] || "bg-foreground/[0.04] text-foreground/70"
                    }`}
                  >
                    {statusLabels[req.status] || req.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {req.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded hover:bg-green-500/10 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" /> Aprovar
                        </button>
                        <button
                          onClick={() => handleCancel(req.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" /> Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
