import Link from "next/link";
import {
  BarChart3,
  FileText,
  ChevronDown,
  Star,
  TrendingUp,
  Wallet,
  ShoppingCart,
  Package,
  DollarSign,
  ArrowRightLeft,
  Users,
  AlertTriangle,
  Building2,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";

interface ReportItem {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

interface ReportCategory {
  title: string;
  description: string;
  icon: React.ReactNode;
  reports: ReportItem[];
}

const reportCategories: ReportCategory[] = [
  {
    title: "DRE (Demonstrativo de Resultados)",
    description:
      "Entenda se sua empresa teve lucro ou prejuízo em um período",
    icon: <BarChart3 className="h-5 w-5 text-yellow-400" />,
    reports: [
      {
        title: "DRE Gerencial",
        description:
          "Visão gerencial do demonstrativo de resultados do exercício",
        href: "/erp/reports?view=dre",
        icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
      },
      {
        title: "DRE por Centros de Custo",
        description:
          "Demonstrativo de resultados segmentado por centro de custo",
        href: "/erp/reports?view=dre-cc",
        icon: <Building2 className="h-4 w-4 text-muted-foreground" />,
      },
    ],
  },
  {
    title: "Fluxo de Caixa",
    description:
      "Acompanhe as entradas e saídas para saber se o caixa está positivo ou negativo",
    icon: <TrendingUp className="h-5 w-5 text-yellow-400" />,
    reports: [
      {
        title: "Fluxo de Caixa Diário",
        description: "Movimentação diária de entradas e saídas do caixa",
        href: "/erp/cash-flow",
        icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
      },
      {
        title: "Fluxo de Caixa Mensal",
        description: "Visão mensal consolidada do fluxo de caixa",
        href: "/erp/reports?view=cash-flow-monthly",
        icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      },
    ],
  },
  {
    title: "Análise Financeira",
    description: "Analise a saúde financeira da sua empresa",
    icon: <Wallet className="h-5 w-5 text-yellow-400" />,
    reports: [
      {
        title: "Contas a Receber",
        description: "Relatório de todas as contas a receber em aberto",
        href: "/erp/receivables",
        icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
      },
      {
        title: "Contas a Pagar",
        description: "Relatório de todas as contas a pagar pendentes",
        href: "/erp/payables",
        icon: <FileText className="h-4 w-4 text-muted-foreground" />,
      },
      {
        title: "Inadimplentes",
        description: "Clientes com pagamentos em atraso",
        href: "/erp/defaulters",
        icon: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
      },
      {
        title: "Extrato Bancário",
        description: "Movimentações e saldos das contas bancárias",
        href: "/erp/transactions",
        icon: <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />,
      },
    ],
  },
  {
    title: "Vendas",
    description: "Acompanhe o desempenho das suas vendas",
    icon: <ShoppingCart className="h-5 w-5 text-yellow-400" />,
    reports: [
      {
        title: "Faturamento por Período",
        description: "Análise do faturamento por intervalo de datas",
        href: "/erp/reports?view=sales",
        icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
      },
      {
        title: "Vendas por Cliente",
        description: "Ranking de vendas agrupado por cliente",
        href: "/erp/reports?view=sales-client",
        icon: <Users className="h-4 w-4 text-muted-foreground" />,
      },
    ],
  },
  {
    title: "Compras",
    description: "Controle suas compras e fornecedores",
    icon: <FileSpreadsheet className="h-5 w-5 text-yellow-400" />,
    reports: [
      {
        title: "Compras por Período",
        description: "Análise de compras por intervalo de datas",
        href: "/erp/reports?view=purchases",
        icon: <ShoppingCart className="h-4 w-4 text-muted-foreground" />,
      },
      {
        title: "Compras por Fornecedor",
        description: "Ranking de compras agrupado por fornecedor",
        href: "/erp/reports?view=purchases-supplier",
        icon: <Building2 className="h-4 w-4 text-muted-foreground" />,
      },
    ],
  },
  {
    title: "Estoque",
    description: "Gerencie a posição do seu estoque",
    icon: <Package className="h-5 w-5 text-yellow-400" />,
    reports: [
      {
        title: "Posição de Estoque",
        description: "Saldo atual de todos os produtos em estoque",
        href: "/inventory",
        icon: <Package className="h-4 w-4 text-muted-foreground" />,
      },
      {
        title: "Movimentações",
        description: "Histórico de entradas e saídas do estoque",
        href: "/inventory/movements",
        icon: <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />,
      },
    ],
  },
];

export default async function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Relatórios Financeiros
        </h2>
        <p className="text-muted-foreground">
          Acesse todos os relatórios da sua empresa
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        <button className="border-b-2 border-yellow-700 px-4 py-2 text-sm font-medium text-yellow-400">
          Padrão
        </button>
        <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          Favoritos
        </button>
      </div>

      {/* Report categories */}
      <div className="space-y-3">
        {reportCategories.map((category) => (
          <details
            key={category.title}
            className="group rounded-lg border bg-card"
            open
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-500/10">
                {category.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">{category.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {category.description}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>

            <div className="border-t px-5 py-2">
              {category.reports.map((report, idx) => (
                <Link
                  key={report.href + idx}
                  href={report.href}
                  className="flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-accent"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    {report.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{report.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {report.description}
                    </p>
                  </div>
                  <span
                    className="shrink-0 p-1 text-muted-foreground"
                    aria-label="Favoritar relatório"
                  >
                    <Star className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
