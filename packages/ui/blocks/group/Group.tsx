import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

import type { GroupAttributes } from "./types"

export function Group({
  children,
  className,
}: GroupAttributes & { children?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border p-4", className)}>
      {children}
    </div>
  )
}
