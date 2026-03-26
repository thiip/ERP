"use client"

import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"

interface ModuleToggleProps {
  moduleId: string
  isEnabled: boolean
  moduleName: string
  toggleAction: (moduleId: string, isEnabled: boolean) => Promise<unknown>
}

function ToggleButton({ isEnabled }: { isEnabled: boolean }) {
  const { pending } = useFormStatus()

  if (pending) {
    return (
      <div className="flex h-6 w-11 items-center justify-center rounded-full bg-foreground/10">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground/50" />
      </div>
    )
  }

  return (
    <button
      type="submit"
      role="switch"
      aria-checked={isEnabled}
      aria-label={isEnabled ? "Desabilitar módulo" : "Habilitar módulo"}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 ${
        isEnabled ? "bg-teal-600" : "bg-foreground/10"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${
          isEnabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}

export function ModuleToggle({
  moduleId,
  isEnabled,
  moduleName,
  toggleAction,
}: ModuleToggleProps) {
  async function handleToggle() {
    await toggleAction(moduleId, !isEnabled)
  }

  return (
    <form action={handleToggle}>
      <input type="hidden" name="moduleId" value={moduleId} />
      <input type="hidden" name="isEnabled" value={String(!isEnabled)} />
      <ToggleButton isEnabled={isEnabled} />
    </form>
  )
}
