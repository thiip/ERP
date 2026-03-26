"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

function Checkbox({
  className,
  id,
  checked,
  onCheckedChange,
  ...props
}: {
  className?: string;
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
} & Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, "checked" | "onCheckedChange">) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded border border-input shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[checked]:border-primary data-[checked]:text-primary-foreground",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="h-3 w-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
