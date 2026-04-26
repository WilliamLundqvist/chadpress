import type { CSSProperties } from "react";

import { cn } from "@repo/ui/lib/utils";

type Layout = Record<string, unknown>;

function isLayout(x: unknown): x is Layout {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

const justifyMap: Record<string, string> = {
  left: "justify-start",
  start: "justify-start",
  "flex-start": "justify-start",
  center: "justify-center",
  right: "justify-end",
  end: "justify-end",
  "flex-end": "justify-end",
  "space-between": "justify-between",
  "space-around": "justify-around",
  "space-evenly": "justify-evenly",
  stretch: "justify-stretch",
};

/** Cross-axis (vertical) in a *row* flex: from `layout.verticalAlignment` (WordPress). */
const flexRowCrossAxis: Record<string, string> = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
  stretch: "items-stretch",
  "space-between": "items-stretch",
  start: "items-start",
  end: "items-end",
};

/**
 * In a *column* (stack) flex, Gutenberg stores:
 * - **main axis (vertical)**: `layout.verticalAlignment` → CSS `justify-content`
 * - **cross axis (horizontal)**: `layout.justifyContent` → CSS `align-items`
 *
 * (See `getLayoutStyle` in `@wordpress/block-editor` flex layout — we had these reversed,
 * so `justify-end` on the class did not match what the "Justify" control does in the stack.)
 */
const flexColumnMainAxis: Record<string, string> = {
  top: "justify-start",
  center: "justify-center",
  bottom: "justify-end",
  stretch: "justify-stretch",
  "space-between": "justify-between",
  start: "justify-start",
  end: "justify-end",
};

/** In a column flex, the "left/center/right" justification → `align-items`. */
const flexColumnCrossFromJustify: Record<string, string> = {
  left: "items-start",
  start: "items-start",
  "flex-start": "items-start",
  center: "items-center",
  right: "items-end",
  end: "items-end",
  "flex-end": "items-end",
  stretch: "items-stretch",
  "space-between": "items-stretch",
};

const gridColClass: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

/**
 * Maps WordPress `layout` block support JSON to Tailwind classes (flex/grid/flow).
 *
 * **Layout parity:** Flex uses the same field mapping as Gutenberg
 * (`getLayoutStyle` for the flex layout). For **vertical (stack)**: `verticalAlignment`
 * → main-axis `justify-*` (up/down the stack); `justifyContent` → cross-axis `items-*`
 * (left/center/right). **Main-axis** `justify` only *visibly* moves items when the
 * container is taller than the content—use dimensions `minHeight` in the block (we pass
 * `style.dimensions.minHeight` through) or a tall parent.
 * **Child block width** (e.g. `chadpress/button`) is still controlled by the child.
 */
export function getGroupLayoutClassName(layout: unknown): string {
  if (!isLayout(layout)) {
    return cn(
      "flex w-full min-w-0 flex-col items-start gap-4",
      "is-layout-default",
    );
  }

  const t = String(layout.type ?? "");

  if (t === "grid") {
    const raw = layout.columnCount;
    const n =
      typeof raw === "number" && raw >= 1
        ? Math.min(6, Math.max(1, Math.round(raw)))
        : typeof raw === "string" && String(raw).trim() !== ""
          ? Math.min(6, Math.max(1, Math.round(Number(raw)) || 2))
          : 2;
    return cn(
      "grid w-full min-w-0 grid-cols-1 justify-items-start gap-4",
      gridColClass[n] ?? "md:grid-cols-2",
      "is-layout-grid",
    );
  }

  if (t === "flex") {
    const orientation = String(layout.orientation ?? "horizontal");
    const isColumn = orientation === "vertical";
    const flexDir = isColumn ? "flex-col" : "flex-row";
    const wrapRaw = layout.flexWrap;
    const wrap =
      wrapRaw === "wrap" || wrapRaw === true
        ? "flex-wrap"
        : wrapRaw === "nowrap" || wrapRaw === false
          ? "flex-nowrap"
          : "flex-wrap";

    if (isColumn) {
      const va = String(
        (layout as { verticalAlignment?: string }).verticalAlignment ?? "top",
      );
      const jc = String(layout.justifyContent ?? "left");
      const justify = flexColumnMainAxis[va] ?? "justify-start";
      const items = flexColumnCrossFromJustify[jc] ?? "items-start";
      return cn(
        "flex w-full min-w-0 gap-4",
        "flex-col",
        wrap,
        justify,
        items,
        "is-layout-flex",
      );
    }

    const jc = String(layout.justifyContent ?? "left");
    const justify = justifyMap[jc] ?? justifyMap.left;
    const va = String(
      (layout as { verticalAlignment?: string }).verticalAlignment ?? "center",
    );
    const items = flexRowCrossAxis[va] ?? "items-center";

    return cn(
      "flex w-full min-w-0 gap-4",
      "flex-row",
      wrap,
      justify,
      items,
      "is-layout-flex",
    );
  }

  if (t === "constrained") {
    return cn(
      "mx-auto w-full min-w-0 max-w-7xl flex flex-col items-start gap-4",
      "is-layout-constrained",
    );
  }

  if (t === "default" || t === "flow" || t === "") {
    return cn(
      "flex w-full min-w-0 flex-col items-start gap-4",
      "is-layout-flow",
    );
  }

  return cn(
    "flex w-full min-w-0 flex-col items-start gap-4",
    "is-layout-default",
  );
}

const allowedGroupTags = new Set([
  "div",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "main",
  "nav",
]);

export type GroupTagName =
  | "div"
  | "section"
  | "article"
  | "aside"
  | "header"
  | "footer"
  | "main"
  | "nav";

export function resolveGroupTag(tagName: string | undefined): GroupTagName {
  const t = String(tagName || "div").toLowerCase();
  if (allowedGroupTags.has(t)) {
    return t as GroupTagName;
  }
  return "div";
}

/**
 * `style` attribute: `spacing.blockGap`, `dimensions.minHeight` (Group block supports min height).
 */
export function getGroupInlineStyle(style: unknown): CSSProperties {
  if (!isLayout(style)) {
    return {};
  }
  const out: CSSProperties = {};
  const spacing = style.spacing;
  if (isLayout(spacing)) {
    if (
      typeof spacing.blockGap === "string" &&
      spacing.blockGap.trim() !== ""
    ) {
      out.gap = spacing.blockGap;
    }
  }
  const dimensions = (style as { dimensions?: unknown }).dimensions;
  if (isLayout(dimensions)) {
    const mh = dimensions.minHeight;
    if (typeof mh === "string" && mh.trim() !== "") {
      out.minHeight = mh;
    }
  }
  return out;
}
