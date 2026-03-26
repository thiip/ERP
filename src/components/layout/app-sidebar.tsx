"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Package,
  Factory,
  DollarSign,
  Settings,
  LogOut,
  FileText,
  FolderKanban,
  Search,
  ShoppingBag,
  ChevronDown,
  Landmark,
  CalendarCheck,
  CreditCard,
  Receipt,
  AlertTriangle,
  ArrowLeftRight,
  TrendingUp,
  History,
  BarChart3,
  Tag,
  Target,
  Warehouse,
  Layers,
  ArrowRightLeft,
  ClipboardCheck,
  ClipboardList,
  Upload,
  Users,
  Cog,
  ShoppingCart,
  Bell,
  Zap,
  Shield,
  Key,
  Globe,
  Database,
  ScrollText,
} from "lucide-react";
import { signOut } from "next-auth/react";
import type { Role } from "@/generated/prisma/client";
import { CompanySwitcher } from "./company-switcher";

type CompanyOption = { id: string; name: string };

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

type NavSection = {
  label: string;
  module: string | null;
  items: NavItem[];
  defaultOpen?: boolean;
};

const sections: NavSection[] = [
  {
    label: "",
    module: null,
    items: [
      { name: "Resumo", href: "/", icon: LayoutDashboard },
    ],
    defaultOpen: true,
  },
  {
    label: "CRM",
    module: "crm",
    items: [
      { name: "Projetos", href: "/crm/pipeline", icon: FolderKanban },
      { name: "Documentos", href: "/crm/documents", icon: FileText },
      { name: "Clientes", href: "/crm/clients/organizations", icon: Building2 },
    ],
  },
  {
    label: "Financeiro",
    module: "financial",
    items: [
      { name: "Visao geral", href: "/erp", icon: DollarSign },
      { name: "Contas bancarias", href: "/erp/bank-accounts", icon: Landmark },
      { name: "Competencia", href: "/erp/accrual", icon: CalendarCheck },
      { name: "Contas a pagar", href: "/erp/payables", icon: CreditCard },
      { name: "Contas a receber", href: "/erp/receivables", icon: Receipt },
      { name: "DDA", href: "/erp/dda", icon: FileText, badge: "Novo" },
      { name: "Inadimplentes", href: "/erp/defaulters", icon: AlertTriangle, badge: "Beta" },
      { name: "Movimentacoes", href: "/erp/transactions", icon: ArrowLeftRight },
      { name: "Fluxo de caixa", href: "/erp/cash-flow", icon: TrendingUp },
      { name: "Vendas", href: "/erp/sales", icon: ShoppingBag },
      { name: "Faturas", href: "/erp/invoices", icon: FileText },
      { name: "Despesas", href: "/erp/expenses", icon: Receipt },
      { name: "Contratos", href: "/erp/contracts", icon: ClipboardList },
      { name: "Historico", href: "/erp/history", icon: History },
      { name: "Relatorios", href: "/erp/reports", icon: BarChart3 },
      { name: "Categorias", href: "/erp/categories", icon: Tag },
      { name: "Centros de custo", href: "/erp/cost-centers", icon: Target },
    ],
  },
  {
    label: "Estoque",
    module: "inventory",
    items: [
      { name: "Visao geral", href: "/inventory", icon: Package },
      { name: "Produtos", href: "/inventory/products", icon: Package },
      { name: "Movimentacoes", href: "/inventory/movements", icon: ArrowLeftRight },
      { name: "Setores", href: "/inventory/sectors", icon: Warehouse },
      { name: "Lotes", href: "/inventory/lots", icon: Layers },
      { name: "Transferencias", href: "/inventory/transfers", icon: ArrowRightLeft },
      { name: "Inventario", href: "/inventory/counts", icon: ClipboardCheck },
      { name: "Estoque projetado", href: "/inventory/projected", icon: TrendingUp },
      { name: "Requisicoes", href: "/inventory/requisitions", icon: FileText },
      { name: "Pedidos de compra", href: "/inventory/purchase-orders", icon: ShoppingCart },
      { name: "Importar", href: "/inventory/import", icon: Upload },
    ],
  },
  {
    label: "Producao",
    module: "production",
    items: [
      { name: "Visao geral", href: "/production", icon: Factory },
      { name: "Ordens", href: "/production/orders", icon: ClipboardList },
      { name: "Fila", href: "/production/queue", icon: Layers },
      { name: "Lista de materiais", href: "/production/bom", icon: Package },
      { name: "Roteiro", href: "/production/routing", icon: ArrowRightLeft },
      { name: "MRP", href: "/production/mrp", icon: Zap },
      { name: "Relatorios", href: "/production/reporting", icon: BarChart3 },
      { name: "Alertas", href: "/production/alerts", icon: Bell },
    ],
  },
  {
    label: "Administracao",
    module: "settings",
    items: [
      { name: "Usuarios", href: "/admin/users", icon: Users },
      { name: "Equipes", href: "/admin/teams", icon: Building2 },
      { name: "Perfis", href: "/admin/profiles", icon: Shield },
      { name: "Modulos", href: "/admin/modules", icon: Cog },
      { name: "Chaves API", href: "/admin/api-keys", icon: Key },
      { name: "Integracoes", href: "/admin/integrations", icon: Globe },
      { name: "Automacoes", href: "/admin/automations", icon: Zap },
      { name: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
      { name: "Configuracoes", href: "/admin/settings", icon: Settings },
    ],
  },
];

const moduleAccess: Record<string, Role[]> = {
  crm: ["ADMIN", "MANAGER", "SALES"],
  inventory: ["ADMIN", "MANAGER", "SALES", "PRODUCTION", "FINANCE"],
  production: ["ADMIN", "MANAGER", "PRODUCTION"],
  financial: ["ADMIN", "MANAGER", "FINANCE"],
  settings: ["ADMIN"],
};

function SectionGroup({
  section,
  pathname,
}: {
  section: NavSection;
  pathname: string;
}) {
  const hasActiveItem = section.items.some((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );
  const [open, setOpen] = useState(section.defaultOpen || hasActiveItem);

  // No label = always visible (Resumo)
  if (!section.label) {
    return (
      <div className="space-y-0.5">
        {section.items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground/80 transition-colors"
      >
        <span>{section.label}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <div className="space-y-0.5">
          {section.items.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/erp"
                ? pathname === "/erp"
                : item.href === "/inventory"
                ? pathname === "/inventory"
                : item.href === "/production"
                ? pathname === "/production"
                : pathname.startsWith(item.href);
            return <NavLink key={item.href} item={item} isActive={isActive} />;
          })}
        </div>
      )}
    </div>
  );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-all ${
        isActive
          ? "glass-pill-active text-foreground font-semibold"
          : "text-foreground/75 hover:text-foreground hover:bg-foreground/[0.06]"
      }`}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.name}</span>
      {item.badge && (
        <span
          className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none ${
            item.badge === "Novo"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function AppSidebar({
  companies,
  userRole,
  userName,
}: {
  companies: CompanyOption[];
  userRole: Role;
  userName?: string;
}) {
  const pathname = usePathname();

  const filteredSections = sections.filter((section) => {
    if (!section.module) return true;
    return moduleAccess[section.module]?.includes(userRole);
  });

  return (
    <div className="fixed left-0 top-0 z-40 flex h-svh w-[260px] flex-col glass-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden">
          <img
            src="/projectum-erp/logo-icon.png"
            alt="P"
            className="h-full w-full object-cover"
          />
        </div>
        <span className="text-[15px] font-semibold text-foreground tracking-tight">
          Projectum
        </span>
      </div>

      {/* Search */}
      <div className="px-3 pb-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/30" />
          <input
            type="text"
            placeholder="Buscar... (⌘K)"
            className="w-full h-8 pl-8 pr-3 rounded-lg text-[12px] text-foreground/70 placeholder:text-foreground/25 glass-input focus:outline-none"
            readOnly
            onFocus={(e) => {
              e.target.blur();
              // Trigger Cmd+K
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
          />
        </div>
      </div>

      <div className="h-px mx-3 bg-foreground/[0.04]" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {filteredSections.map((section) => (
          <SectionGroup
            key={section.label || "main"}
            section={section}
            pathname={pathname}
          />
        ))}
      </nav>

      <div className="h-px mx-3 bg-foreground/[0.04]" />

      {/* Bottom: Company + User */}
      <div className="px-3 py-3 space-y-2 shrink-0">
        {/* Company Switcher */}
        {companies.length > 0 && (
          <div className="px-1">
            <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-foreground/25 mb-1">
              Empresa
            </p>
            <CompanySwitcher companies={companies} />
          </div>
        )}

        {/* User + Logout */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-violet-500 text-white dark:text-white shrink-0">
            <span className="text-[10px] font-semibold">
              {userName?.charAt(0)?.toUpperCase() ?? "U"}
            </span>
          </div>
          <span className="text-[13px] text-foreground/75 truncate flex-1">
            {userName ?? "Usuario"}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/45 hover:text-foreground/75 hover:bg-foreground/[0.04] transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
