"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { globalSearch, type SearchResult } from "@/actions/search";
import {
  Search,
  Building2,
  Users,
  Handshake,
  Package,
  Receipt,
  Factory,
  CreditCard,
  Landmark,
  ArrowLeftRight,
  ClipboardList,
  ShoppingCart,
  Warehouse,
  FolderTree,
  Target,
  FileText,
  FileSignature,
  Command,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  DollarSign,
  LayoutDashboard,
  Settings,
  CalendarDays,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Icon / label / color maps
// ---------------------------------------------------------------------------

const typeIcons: Record<string, React.ElementType> = {
  organization: Building2,
  contact: Users,
  deal: Handshake,
  product: Package,
  invoice: Receipt,
  production: Factory,
  expense: CreditCard,
  bank_account: Landmark,
  bank_transaction: ArrowLeftRight,
  requisition: ClipboardList,
  purchase_order: ShoppingCart,
  sector: Warehouse,
  category: FolderTree,
  cost_center: Target,
  proposal: FileText,
  contract: FileSignature,
};

const typeLabels: Record<string, string> = {
  organization: "Empresa",
  contact: "Contato",
  deal: "Negocio",
  product: "Produto",
  invoice: "Fatura",
  production: "Producao",
  expense: "Despesa",
  bank_account: "Conta",
  bank_transaction: "Transacao",
  requisition: "Requisicao",
  purchase_order: "Pedido Compra",
  sector: "Setor",
  category: "Categoria",
  cost_center: "Centro Custo",
  proposal: "Proposta",
  contract: "Contrato",
};

const categoryColors: Record<string, string> = {
  CRM: "text-emerald-500",
  Financeiro: "text-yellow-500",
  Estoque: "text-teal-500",
  "Producao": "text-green-500",
  "Produção": "text-green-500",
  "Administracao": "text-orange-500",
  "Administração": "text-orange-500",
};

const categoryBgColors: Record<string, string> = {
  CRM: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  Financeiro: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Estoque: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  "Producao": "bg-green-500/10 text-green-500 border-green-500/20",
  "Produção": "bg-green-500/10 text-green-500 border-green-500/20",
  "Administracao": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Administração": "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const categoryBarColors: Record<string, string> = {
  CRM: "bg-emerald-500",
  Financeiro: "bg-yellow-500",
  Estoque: "bg-teal-500",
  "Producao": "bg-green-500",
  "Produção": "bg-green-500",
  "Administracao": "bg-orange-500",
  "Administração": "bg-orange-500",
};

// ---------------------------------------------------------------------------
// Quick links for empty state
// ---------------------------------------------------------------------------

const quickLinks = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, category: "CRM" },
  { label: "Empresas", href: "/crm/organizations", icon: Building2, category: "CRM" },
  { label: "Contatos", href: "/crm/contacts", icon: Users, category: "CRM" },
  { label: "Negocios", href: "/crm/deals", icon: Handshake, category: "CRM" },
  { label: "Faturas", href: "/financeiro/invoices", icon: Receipt, category: "Financeiro" },
  { label: "Despesas", href: "/financeiro/expenses", icon: CreditCard, category: "Financeiro" },
  { label: "Produtos", href: "/estoque/products", icon: Package, category: "Estoque" },
  { label: "Producao", href: "/producao", icon: Factory, category: "Produção" },
  { label: "Calendario", href: "/calendar", icon: CalendarDays, category: "CRM" },
  { label: "Configuracoes", href: "/admin/settings", icon: Settings, category: "Administração" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    if (query.trim().length < 2) return quickLinks.map((l) => ({ ...l, id: l.href, type: "quicklink", title: l.label, subtitle: "", href: l.href }));
    return results;
  }, [query, results]);

  // Group results by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof flatResults>();
    for (const item of flatResults) {
      const cat = (item as any).category ?? "";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [flatResults]);

  // Flat list for keyboard index (preserving group order)
  const flatList = useMemo(() => {
    const arr: typeof flatResults = [];
    for (const items of grouped.values()) {
      arr.push(...items);
    }
    return arr;
  }, [grouped]);

  // -----------------------------------------------------------------------
  // Open / Close
  // -----------------------------------------------------------------------

  const open = useCallback(() => {
    setIsOpen(true);
    setIsAnimating(true);
    setSelectedIndex(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const close = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsOpen(false);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }, 200);
  }, []);

  // -----------------------------------------------------------------------
  // Keyboard shortcut: Cmd+K / Ctrl+K
  // -----------------------------------------------------------------------

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, open, close]);

  // -----------------------------------------------------------------------
  // Search debounce
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await globalSearch(query);
        setResults(res);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  // -----------------------------------------------------------------------
  // Navigate
  // -----------------------------------------------------------------------

  const navigateTo = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [router, close],
  );

  // -----------------------------------------------------------------------
  // Scroll selected item into view
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // -----------------------------------------------------------------------
  // Keyboard navigation inside the palette
  // -----------------------------------------------------------------------

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }

    if (flatList.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i < flatList.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i > 0 ? i - 1 : flatList.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatList[selectedIndex]) {
        navigateTo(flatList[selectedIndex].href);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Don't render anything when closed
  // -----------------------------------------------------------------------

  if (!isOpen) return null;

  const showQuickLinks = query.trim().length < 2;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 flex items-start justify-center pt-[12vh] transition-all duration-200 ${
          isAnimating
            ? "bg-black/40 backdrop-blur-sm"
            : "bg-black/0 backdrop-blur-0"
        }`}
        onClick={close}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-[640px] mx-4 overflow-hidden rounded-2xl glass-card-strong shadow-2xl transition-all duration-200 origin-top ${
            isAnimating
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-4"
          }`}
          style={{
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.06), 0 25px 50px -12px rgba(0,0,0,0.5), 0 0 80px rgba(0,0,0,0.15)",
          }}
        >
          {/* Search input area */}
          <div className="flex items-center gap-3 border-b border-foreground/[0.06] px-4">
            <Search className="h-5 w-5 text-foreground/30 shrink-0" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Buscar em tudo..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-14 flex-1 border-0 bg-transparent text-lg font-light text-foreground/90 placeholder:text-foreground/25 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-foreground/10 bg-foreground/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-foreground/30">
              ESC
            </kbd>
          </div>

          {/* Results body */}
          <div
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto overscroll-contain"
          >
            {/* Loading state */}
            {isLoading && (
              <div className="px-4 py-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-xl bg-foreground/[0.06]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-2/3 rounded-md bg-foreground/[0.06]" />
                      <div className="h-2.5 w-1/3 rounded-md bg-foreground/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {!isLoading && !showQuickLinks && results.length === 0 && query.trim().length >= 2 && (
              <div className="flex flex-col items-center justify-center py-14 px-4">
                <div className="h-12 w-12 rounded-2xl bg-foreground/[0.04] flex items-center justify-center mb-3">
                  <Search className="h-5 w-5 text-foreground/20" />
                </div>
                <p className="text-sm font-medium text-foreground/40">
                  Nenhum resultado encontrado
                </p>
                <p className="text-xs text-foreground/25 mt-1">
                  Tente uma busca diferente para &ldquo;{query}&rdquo;
                </p>
              </div>
            )}

            {/* Quick links (empty state) */}
            {!isLoading && showQuickLinks && (
              <div className="p-2">
                <div className="px-3 pt-2 pb-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/25">
                    Acesso rapido
                  </p>
                </div>
                {quickLinks.map((link, i) => {
                  const Icon = link.icon;
                  const isSelected = selectedIndex === i;
                  const color = categoryColors[link.category] ?? "text-foreground/40";
                  return (
                    <button
                      key={link.href}
                      data-index={i}
                      onClick={() => navigateTo(link.href)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-foreground/[0.06]"
                          : "hover:bg-foreground/[0.03]"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                          isSelected ? "bg-foreground/[0.06]" : "bg-foreground/[0.03]"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <span className="text-sm font-medium text-foreground/70">
                        {link.label}
                      </span>
                      {isSelected && (
                        <CornerDownLeft className="ml-auto h-3.5 w-3.5 text-foreground/20" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Grouped results */}
            {!isLoading && !showQuickLinks && results.length > 0 && (
              <div className="p-2">
                {Array.from(grouped.entries()).map(([category, items]) => {
                  const barColor = categoryBarColors[category] ?? "bg-foreground/20";
                  const catColor = categoryColors[category] ?? "text-foreground/40";
                  return (
                    <div key={category} className="mb-1 last:mb-0">
                      {/* Category header */}
                      <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                        <div className={`h-3 w-0.5 rounded-full ${barColor}`} />
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${catColor}`}>
                          {category}
                        </p>
                        <span className="text-[10px] text-foreground/20">
                          {items.length}
                        </span>
                      </div>

                      {/* Items */}
                      {items.map((result) => {
                        const globalIndex = flatList.indexOf(result);
                        const isSelected = selectedIndex === globalIndex;
                        const Icon = typeIcons[result.type] ?? Search;
                        const badgeColor =
                          categoryBgColors[(result as any).category] ??
                          "bg-foreground/[0.04] text-foreground/40 border-foreground/10";

                        return (
                          <button
                            key={`${result.type}-${result.id}`}
                            data-index={globalIndex}
                            onClick={() => navigateTo(result.href)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                              isSelected
                                ? "bg-foreground/[0.06]"
                                : "hover:bg-foreground/[0.03]"
                            }`}
                          >
                            {/* Icon */}
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-foreground/[0.06]"
                                  : "bg-foreground/[0.03]"
                              }`}
                            >
                              <Icon
                                className={`h-4 w-4 ${
                                  isSelected ? catColor : "text-foreground/30"
                                } transition-colors`}
                              />
                            </div>

                            {/* Text */}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground/80 truncate">
                                {result.title}
                              </p>
                              {result.subtitle && (
                                <p className="text-xs text-foreground/30 truncate mt-0.5">
                                  {result.subtitle}
                                </p>
                              )}
                            </div>

                            {/* Type badge */}
                            <span
                              className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${badgeColor}`}
                            >
                              {typeLabels[result.type] ?? result.type}
                            </span>

                            {/* Enter hint */}
                            {isSelected && (
                              <CornerDownLeft className="shrink-0 h-3.5 w-3.5 text-foreground/20" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with keyboard hints */}
          <div className="flex items-center gap-4 border-t border-foreground/[0.06] px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-foreground/25">
              <kbd className="inline-flex items-center justify-center rounded border border-foreground/10 bg-foreground/[0.04] px-1 py-0.5 min-w-[20px]">
                <ArrowUp className="h-2.5 w-2.5" />
              </kbd>
              <kbd className="inline-flex items-center justify-center rounded border border-foreground/10 bg-foreground/[0.04] px-1 py-0.5 min-w-[20px]">
                <ArrowDown className="h-2.5 w-2.5" />
              </kbd>
              <span className="ml-0.5">navegar</span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-foreground/25">
              <kbd className="inline-flex items-center justify-center rounded border border-foreground/10 bg-foreground/[0.04] px-1 py-0.5 min-w-[20px]">
                <CornerDownLeft className="h-2.5 w-2.5" />
              </kbd>
              <span className="ml-0.5">abrir</span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-foreground/25">
              <kbd className="inline-flex items-center justify-center rounded border border-foreground/10 bg-foreground/[0.04] px-1 py-0.5 text-[9px] font-medium min-w-[20px]">
                esc
              </kbd>
              <span className="ml-0.5">fechar</span>
            </div>

            <div className="ml-auto flex items-center gap-1 text-[10px] text-foreground/20">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
