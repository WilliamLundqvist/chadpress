import { cn } from "@repo/ui/lib/utils"

const vAlign: Record<string, string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
  stretch: "items-stretch",
}

export function getColumnsClassName(
  verticalAlignment: string | undefined,
  isStackedOnMobile: boolean | undefined,
): string {
  const align = vAlign[verticalAlignment ?? ""] ?? "items-stretch"
  if (isStackedOnMobile === false) {
    return cn("flex w-full min-w-0 flex-row flex-nowrap gap-4", align)
  }
  return cn(
    "flex w-full min-w-0 flex-col flex-wrap gap-4 md:flex-row md:flex-nowrap",
    "md:items-stretch",
    align,
  )
}
