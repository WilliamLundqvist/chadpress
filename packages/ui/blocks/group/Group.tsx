import type { ElementType, ReactNode } from "react";

import { cn } from "@repo/ui/lib/utils";

import block from "./block.json";
import {
  getGroupInlineStyle,
  getGroupLayoutClassName,
  resolveGroupTag,
} from "./group-layout";
import type { GroupAttributes } from "./types";

const { className: wrapperClassName } = block.customTailwind;

export function Group({
  tagName,
  layout,
  style,
  children,
  className,
}: GroupAttributes & { children?: ReactNode; className?: string }) {
  const tag = typeof tagName === "string" ? tagName : undefined;
  const Tag = resolveGroupTag(tag) as ElementType;
  const layoutClasses = getGroupLayoutClassName(layout);
  const inlineStyle = getGroupInlineStyle(style);

  return (
    <Tag
      className={cn(wrapperClassName || undefined, layoutClasses, className)}
      style={Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined}
    >
      {children}
    </Tag>
  );
}
