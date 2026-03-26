import Link from "next/link";
import { Building2, Users, UserCircle } from "lucide-react";

const tabs = [
  {
    label: "Empresas",
    href: "/crm/clients/organizations",
    icon: Building2,
  },
  {
    label: "Contatos",
    href: "/crm/clients/contacts",
    icon: Users,
  },
  {
    label: "Clientes PF",
    href: "/crm/clients/pf",
    icon: UserCircle,
  },
];

export default function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-6">
      <nav className="w-48 shrink-0 space-y-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground/50 transition-colors hover:bg-foreground/[0.04] hover:text-foreground/80"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
