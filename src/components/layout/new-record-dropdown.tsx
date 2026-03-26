"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  DollarSign,
  Receipt,
  ShoppingCart,
  FileText,
  Package,
  Users,
  Building2,
  ArrowRightLeft,
  ClipboardList,
  Factory,
  Briefcase,
} from "lucide-react";

const quickActions = [
  {
    group: "Financeiro",
    items: [
      { label: "Receita", href: "/erp/receivables", icon: DollarSign, shortcut: "Alt+R" },
      { label: "Despesa", href: "/erp/expenses/new", icon: Receipt, shortcut: "Alt+D" },
      { label: "Transferencia", href: "/erp/transactions", icon: ArrowRightLeft, shortcut: "Alt+T" },
    ],
  },
  {
    group: "Vendas",
    items: [
      { label: "Fatura / Venda", href: "/erp/invoices/new", icon: FileText, shortcut: "Alt+V" },
      { label: "Orcamento", href: "/crm/deals/new", icon: ClipboardList, shortcut: "Alt+O" },
      { label: "Contrato", href: "/erp/contracts", icon: Briefcase, shortcut: "Alt+B" },
    ],
  },
  {
    group: "Compras",
    items: [
      { label: "Ordem de Compra", href: "/inventory/purchase-orders/new", icon: ShoppingCart, shortcut: "Alt+P" },
      { label: "Requisicao", href: "/inventory/requisitions/new", icon: ClipboardList, shortcut: "Alt+Q" },
    ],
  },
  {
    group: "Cadastros",
    items: [
      { label: "Produto", href: "/inventory/products/new", icon: Package, shortcut: "Alt+X" },
      { label: "Cliente / Org.", href: "/crm/clients/organizations/new", icon: Building2, shortcut: "Alt+L" },
      { label: "Contato", href: "/crm/clients/contacts", icon: Users, shortcut: "Alt+C" },
    ],
  },
  {
    group: "Producao",
    items: [
      { label: "Ordem de Producao", href: "/production/orders/new", icon: Factory, shortcut: "Alt+F" },
    ],
  },
];

export function NewRecordDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);

      if (e.altKey) {
        for (const group of quickActions) {
          for (const item of group.items) {
            const shortcutKey = item.shortcut.replace("Alt+", "").toLowerCase();
            if (e.key.toLowerCase() === shortcutKey) {
              e.preventDefault();
              router.push(item.href);
              setOpen(false);
              return;
            }
          }
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg bg-foreground/10 px-3 py-1.5 text-sm font-medium text-foreground/80 transition-all hover:bg-foreground/15 active:scale-95"
      >
        <Plus className="h-4 w-4" />
        <span>Novo</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl glass-card-strong shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[420px] overflow-y-auto py-2">
            {quickActions.map((group, gi) => (
              <div key={group.group}>
                {gi > 0 && <div className="mx-3 my-1 h-px bg-foreground/[0.04]" />}
                <div className="px-3 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/25">
                    {group.group}
                  </span>
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      router.push(item.href);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-foreground/60 hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                  >
                    <item.icon className="h-4 w-4 text-foreground/30" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <span className="text-[10px] text-foreground/20 font-mono">
                      {item.shortcut}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
