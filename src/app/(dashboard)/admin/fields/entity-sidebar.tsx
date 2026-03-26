"use client"

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Building2,
  Users,
  Handshake,
  Package,
  FileText,
} from "lucide-react"

interface EntityItem {
  key: string
  label: string
}

interface EntityCategory {
  key: string
  label: string
  icon: React.ElementType
  items: EntityItem[]
}

const categories: EntityCategory[] = [
  {
    key: "client",
    label: "Cliente",
    icon: Building2,
    items: [
      { key: "client", label: "Empresas" },
      { key: "contact", label: "Pessoas" },
    ],
  },
  {
    key: "deal",
    label: "Negocio",
    icon: Handshake,
    items: [{ key: "deal", label: "Negocios" }],
  },
  {
    key: "product",
    label: "Produto",
    icon: Package,
    items: [{ key: "product", label: "Produtos" }],
  },
  {
    key: "proposal",
    label: "Proposta",
    icon: FileText,
    items: [{ key: "proposal", label: "Propostas" }],
  },
]

interface EntitySidebarProps {
  selectedEntity: string
  onSelectEntity: (entity: string) => void
}

export function EntitySidebar({
  selectedEntity,
  onSelectEntity,
}: EntitySidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => {
      const initial = new Set<string>()
      for (const cat of categories) {
        if (cat.items.some((item) => item.key === selectedEntity)) {
          initial.add(cat.key)
        }
      }
      if (initial.size === 0) initial.add("client")
      return initial
    },
  )

  function toggleCategory(catKey: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catKey)) {
        next.delete(catKey)
      } else {
        next.add(catKey)
      }
      return next
    })
  }

  return (
    <aside className="w-64 shrink-0 border-r border-foreground/[0.08] bg-card">
      <div className="border-b border-foreground/[0.08] px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/50">
          Entidades
        </h2>
      </div>

      <nav className="py-2">
        {categories.map((cat) => {
          const Icon = cat.icon
          const isExpanded = expandedCategories.has(cat.key)

          return (
            <div key={cat.key}>
              <button
                type="button"
                onClick={() => toggleCategory(cat.key)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.03]"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-foreground/40" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-foreground/40" />
                )}
                <Icon className="h-4 w-4 text-foreground/50" />
                <span>{cat.label}</span>
              </button>

              {isExpanded && (
                <div className="ml-6 border-l border-foreground/[0.04]">
                  {cat.items.map((item) => {
                    const isActive = selectedEntity === item.key
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onSelectEntity(item.key)}
                        className={`block w-full py-1.5 pl-6 pr-4 text-left text-sm transition-colors ${
                          isActive
                            ? "bg-teal-500/10 font-medium text-teal-400"
                            : "text-foreground/60 hover:bg-foreground/[0.03] hover:text-foreground"
                        }`}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
