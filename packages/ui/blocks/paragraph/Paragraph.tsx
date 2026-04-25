import { cn } from "@repo/ui/lib/utils";

import block from "./block.json";
import { paragraphVariants } from "./paragraph-variants";
import type { ParagraphAttributes } from "./types";

const { styleMap, className: wrapperClassName } = block.customTailwind;

export function Paragraph({
  content,
  align: alignAttr,
  className,
}: ParagraphAttributes & { className?: string }) {
  const align = styleMap.align[alignAttr as keyof typeof styleMap.align] as
    | "start"
    | "center"
    | "end"
  return (
    <p
      className={cn(
        paragraphVariants({ align }),
        wrapperClassName || undefined,
        className,
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
