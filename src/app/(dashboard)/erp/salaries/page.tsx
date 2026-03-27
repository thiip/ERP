import Link from "next/link";
import {
  DollarSign,
  TrendingDown,
  Wallet,
  Users,
  Cloud,
  FileText,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  MoreHorizontal,
} from "lucide-react";
import { getSalaries, getEmployees, getSalaryDashboard, getSyncLogs } from "@/actions/salary";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

const monthNames = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const employeeStatusColors: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-400",
  INACTIVE: "bg-foreground/[0.04] text-foreground/50",
  ON_LEAVE: "bg-yellow-500/10 text-yellow-400",
  TERMINATED: "bg-red-500/10 text-red-400",
};

const employeeStatusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  ON_LEAVE: "Afastado",
  TERMINATED: "Desligado",
};

const syncStatusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400",
  FAILED: "bg-red-500/10 text-red-400",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-400",
};

const syncStatusLabels: Record<string, string> = {
  COMPLETED: "Concluido",
  FAILED: "Falhou",
  IN_PROGRESS: "Em andamento",
};

export default async function SalariesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const currentDate = new Date();
  const selectedMonth = params.month ? parseInt(params.month) : currentDate.getMonth() + 1;
  const selectedYear = params.year ? parseInt(params.year) : currentDate.getFullYear();
  const activeTab = params.tab || "payroll";

  const [salaries, employees, dashboard, syncLogs] = await Promise.all([
    getSalaries(selectedMonth, selectedYear),
    getEmployees(),
    getSalaryDashboard(selectedYear),
    getSyncLogs(),
  ]);

  const totalBruto = salaries.reduce((sum: number, s: any) => sum + Number(s.grossAmount || 0), 0);
  const totalDescontos = salaries.reduce((sum: number, s: any) => sum + Number(s.deductions || 0), 0);
  const totalLiquido = salaries.reduce((sum: number, s: any) => sum + Number(s.netAmount || 0), 0);
  const activeEmployees = employees.filter((e: any) => e.status === "ACTIVE").length;

  function prevMonthParams() {
    const m = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const y = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    return `?month=${m}&year=${y}&tab=${activeTab}`;
  }

  function nextMonthParams() {
    const m = selectedMonth === 12 ? 1 : selectedMonth + 1;
    const y = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
    return `?month=${m}&year=${y}&tab=${activeTab}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Salarios</h2>
          <p className="text-muted-foreground">
            Gestao de folha de pagamento e funcionarios
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl glass-card p-1">
        <Link
          href={`/erp/salaries?month=${selectedMonth}&year=${selectedYear}&tab=payroll`}
          className={`flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-all ${
            activeTab === "payroll"
              ? "bg-emerald-500/15 text-emerald-400 shadow-sm"
              : "text-foreground/60 hover:text-foreground/80 hover:bg-foreground/[0.04]"
          }`}
        >
          Folha de Pagamento
        </Link>
        <Link
          href={`/erp/salaries?month=${selectedMonth}&year=${selectedYear}&tab=employees`}
          className={`flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-all ${
            activeTab === "employees"
              ? "bg-emerald-500/15 text-emerald-400 shadow-sm"
              : "text-foreground/60 hover:text-foreground/80 hover:bg-foreground/[0.04]"
          }`}
        >
          Funcionarios
        </Link>
        <Link
          href={`/erp/salaries?month=${selectedMonth}&year=${selectedYear}&tab=sync`}
          className={`flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-all ${
            activeTab === "sync"
              ? "bg-emerald-500/15 text-emerald-400 shadow-sm"
              : "text-foreground/60 hover:text-foreground/80 hover:bg-foreground/[0.04]"
          }`}
        >
          Sincronizacao
        </Link>
      </div>

      {/* Tab: Folha de Pagamento */}
      {activeTab === "payroll" && (
        <div className="space-y-6">
          {/* Month/Year Selector */}
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-foreground/50 block mb-1">Periodo</span>
              <div className="flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-1.5">
                <Link href={`/erp/salaries${prevMonthParams()}`} className="text-foreground/50 hover:text-foreground/70">
                  <ChevronLeft className="h-4 w-4" />
                </Link>
                <span className="text-sm font-medium min-w-[160px] text-center">
                  {monthNames[selectedMonth - 1]} de {selectedYear}
                </span>
                <Link href={`/erp/salaries${nextMonthParams()}`} className="text-foreground/50 hover:text-foreground/70">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-emerald-500/10 p-3">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-foreground/50">Total Bruto</p>
                  <p className="text-xl font-bold">{formatCurrency(totalBruto)}</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-red-500/10 p-3">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-foreground/50">Total Descontos</p>
                  <p className="text-xl font-bold">{formatCurrency(totalDescontos)}</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-blue-500/10 p-3">
                  <Wallet className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-foreground/50">Total Liquido</p>
                  <p className="text-xl font-bold">{formatCurrency(totalLiquido)}</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-purple-500/10 p-3">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-foreground/50">Funcionarios Ativos</p>
                  <p className="text-xl font-bold">{activeEmployees}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
              <FileText className="h-4 w-4" />
              Gerar Folha do Mes
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]">
              <Cloud className="h-4 w-4" />
              Sincronizar SharePoint
            </button>
          </div>

          {/* Payroll Table */}
          <div className="rounded-xl glass-card-elevated overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Funcionario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Departamento</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Bruto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Descontos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Liquido</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04]">
                {salaries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-foreground/50">
                      Nenhum registro de folha para este periodo
                    </td>
                  </tr>
                )}
                {salaries.map((salary: any) => (
                  <tr key={salary.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">
                      {salary.employee?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60">
                      {salary.employee?.department || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right">
                      {formatCurrency(Number(salary.grossAmount || 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-400 text-right">
                      {formatCurrency(Number(salary.deductions || 0))}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right">
                      {formatCurrency(Number(salary.netAmount || 0))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          salary.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {salary.status === "PAID" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="rounded p-1 text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.06]">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="rounded p-1 text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.06]">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="rounded p-1 text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.06]">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Funcionarios */}
      {activeTab === "employees" && (
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
              <Plus className="h-4 w-4" />
              Novo Funcionario
            </button>
          </div>

          {/* Employees Table */}
          <div className="rounded-xl glass-card-elevated overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Departamento</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Cargo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Data Admissao</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Salario Base</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04]">
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-foreground/50">
                      Nenhum funcionario cadastrado
                    </td>
                  </tr>
                )}
                {employees.map((employee: any) => (
                  <tr key={employee.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">
                      {employee.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60">
                      {employee.cpf || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60">
                      {employee.department || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60">
                      {employee.position || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60">
                      {employee.hireDate ? formatDate(employee.hireDate) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right">
                      {employee.baseSalary ? formatCurrency(Number(employee.baseSalary)) : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          employeeStatusColors[employee.status] || "bg-foreground/[0.04] text-foreground/50"
                        }`}
                      >
                        {employeeStatusLabels[employee.status] || employee.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Sincronizacao */}
      {activeTab === "sync" && (
        <div className="space-y-6">
          {/* Info Card */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Cloud className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Sincronizacao com SharePoint</p>
                <p className="text-xs text-foreground/50 mt-1">
                  A sincronizacao permite importar e exportar dados de funcionarios e folha de pagamento
                  diretamente do SharePoint da empresa. Configure as credenciais em Administracao &gt; Integracoes.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
              <RefreshCw className="h-4 w-4" />
              Iniciar Sincronizacao
            </button>
          </div>

          {/* Sync Logs Table */}
          <div className="rounded-xl glass-card-elevated overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Direcao</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Lidos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Escritos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Conflitos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04]">
                {syncLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-foreground/50">
                      Nenhum registro de sincronizacao
                    </td>
                  </tr>
                )}
                {syncLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm">
                      {log.createdAt ? formatDate(log.createdAt) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/60">
                      {log.direction === "IMPORT" ? "Importacao" : "Exportacao"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          syncStatusColors[log.status] || "bg-foreground/[0.04] text-foreground/50"
                        }`}
                      >
                        {syncStatusLabels[log.status] || log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {log.recordsRead ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {log.recordsWritten ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {log.conflicts ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
