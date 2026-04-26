# Chadpress Declaration Engine

> Source of truth for **how blocks are authored** in this monorepo. Read this before creating, modifying, or refactoring any block. If you find yourself wanting to break one of these rules, update this document first — don't silently diverge.

**Repo setup, DDEV mounts, and first-run builds:** [monorepo README](../../../README.md) and [apps/wp-plugin/README.md](../../../apps/wp-plugin/README.md).

## Prime directive

**`block.json` is the law.** It is the single source of truth for a block's data shape, styling tokens, and editor UX. Every other artifact — TypeScript types, React components, WP `edit.js`, Next.js renderer — must be derived from (or conform to) it. Declare once, consume everywhere.

## Mapping WordPress **core** blocks (shadow declarations)

> **Before** suggesting `register_block_type` or a bespoke Gutenberg `edit.js` for a core block, read this section.

**WordPress core** (`core/heading`, `core/paragraph`, `core/image`, …) already provides: Gutenberg UI, serialization, paste, a11y, i18n, and (with **WPGraphQL + WPGraphQL Content Blocks**) a GraphQL schema for `editorBlocks` with attribute types.

Our strategy:

1. **Do not register the same block again** unless we intentionally replace core. WordPress remains the source of serialized content.
2. **Shadow declaration** in the monorepo: e.g. `packages/ui/blocks/heading/` contains a `block.json` whose `name` matches WP exactly (`"core/heading"`). `attributes` mirror a **real subset** of WP’s attributes so the frontend knows the contract. `customControls` is often empty for core — WordPress already owns those controls in the editor.
3. **Join key** across systems: `block.name` + matching attribute names. GraphQL returns `{ name: "core/heading", attributes: { … } }`; Next.js resolves `blockRegistry["core/heading"].Component(attrs)`.
4. **Design is ours:** `customTailwind.styleMap` and `customControls` follow our schema, but values in GraphQL are **only** what WP persists. For 1:1 Gutenberg iframe preview, `apps/wp-plugin` enqueues the same design tokens via `add_editor_style()` (built from `packages/ui` → `chadpress-ui/dist/editor.css`; see DDEV mount) targeting WP’s DOM (e.g. `.wp-block-heading`, `has-text-align-*` in `src/wp-editor.css`).
5. **When do we add a Chadpress-only block?** Only when core does not cover the use case, or we deliberately replace a core implementation. Document that here and in the block’s `description`.

**Playbook for the next core block (e.g. `core/paragraph`):** same eight steps below; you can skip registry-only concerns if you rely entirely on WP’s built-in registration — the monorepo registry still needs the same `name` so the Next renderer can resolve the component. Add CVA / `*-variants.ts` and update `src/wp-editor.css` for iframe parity.

**Registry vs WordPress:** `blockRegistry` is for **Next.js** to look up `Component`, not to register blocks in PHP. For core shadows the plugin mainly loads editor CSS; for `chadpress/*` it reads `block.json` from disk and calls `register_block_type` plus the editor bundle.

## Core philosophy (five non-negotiables)

1. **Contract first.** A block does not exist until its `block.json` does. Never write `.tsx`/PHP before the JSON.
2. **No arbitrary Tailwind in components.** Any class that governs a block's *configurable* design must trace back to either (a) a key in `block.json` `customTailwind`, or (b) a `cva()` variant keyed by a value in that JSON. A bare hardcoded class in a component is a bug.
3. **shadcn-native, not shadcn-adjacent.** Components come from the shadcn CLI when the registry has them (`button`, `card`, …). When it doesn't (e.g. `typography` — shadcn explicitly does not ship it), we follow shadcn's documented patterns with `cva` + `cn` co-located with the block. We do not invent fake "shadcn" components in `src/components/ui/` that the CLI never produced.
4. **Pure React in `packages/ui`.** Zero WP-specific imports. Zero Next.js-specific imports. Blocks must be renderable by any React runtime.
5. **No logic duplication.** Validation / transformation shared between WP (`edit.js`) and Next.js lives in a util inside `packages/ui`, imported by both sides.

## The four-layer contract

Every `block.json` in `packages/ui/blocks/<name>/` has these top-level keys, validated by [`block.schema.json`](./block.schema.json):

### 1. `attributes` — data shape

WP-standard attribute records (`{ type, default, ... }`) **plus** optional chadpress annotations:

- `richText: true` — marks string attributes that WP should render through `RichText` in the editor.

Types are inferred into TypeScript automatically via `InferAttributes<typeof block>` (see [`types.ts`](./types.ts)). **Never** hand-write an attributes interface.

### 2. `supports` — composition primitives

Reserved shape even when unused:

```jsonc
"supports": {
  "innerBlocks": false,          // true for Group/Columns/etc.
  "allowedBlocks": [],           // e.g. ["core/paragraph"]
  "template": []                 // starter scaffold for the editor
}
```

### 3. `customTailwind` — style contract

The **semantic token** layer. JSON knows *intent* ("this is an h2"); the component's CVA knows *classes*. Two sub-keys:

- `styleMap: { <attributeName>: { <attributeValue>: <semanticToken> } }` — maps JSON-storable attribute values to CVA variant keys. Example: `level.2 → "h2"`, `textAlign.center → "center"`.
- `className: string` — **escape hatch**. Extra raw classes applied to the block's wrapper. Default `""`. Use sparingly, only for wrapper-level overrides that genuinely belong in the contract (e.g. block-wide padding). Per-component design decisions belong in the CVA, not here.

> **Why this layering?** Raw Tailwind strings in JSON would couple the contract to a styling engine and break when the design system swaps (e.g. shadcn style change). Semantic tokens let the contract say *what* and let the implementation say *how*. The `className` field is an escape hatch, not a default.

### 4. `customControls` — editor UX

How the WP plugin (Phase 3) auto-generates the Gutenberg editor UI from the contract. Two arrays:

```jsonc
"customControls": {
  "toolbar":   [ /* controls that appear in the block toolbar */ ],
  "inspector": [ /* controls that appear in the sidebar */ ]
}
```

Each control has a fixed shape: `{ type, bind, label, options? }` where `type` is from a closed vocabulary (`alignment`, `headingLevel`, `select`, `toggle`, `text`, `color`) and `bind` is the attribute the control writes to. Adding a new control type requires updating both the `block.schema.json` enum and (eventually) the WP plugin's control resolver — do not add one-off types.

### 5. `customEditor` — WordPress editor policy

For **core shadow blocks**, WordPress already owns the edit UI. `customEditor` declares how we constrain that UI so authors can only configure settings the frontend contract renders.

```jsonc
"customEditor": {
  "source": "core",
  "allowedRichText": ["bold", "italic", "link"],
  "disabledSupports": ["color", "backgroundColor", "fontSize"]
}
```

Rules:

- If a setting is visible in Gutenberg, it must be declared in `block.json`, delivered by GraphQL, and rendered by the React component.
- `allowedRichText` is allowed because it stays inside `attributes.content` HTML (`richText: true`). For `heading`, bold/italic/link are accepted.
- `disabledSupports` is read by `apps/wp-plugin/chadpress.php` and mapped to WordPress block supports. For `core/heading`, text color, background/gradient, and font-size controls are disabled until we intentionally declare/render them.
- When we later create **custom** `chadpress/*` blocks, `source: "custom"` means the editor UI comes from our generated controls, not from WP core block supports.

### Reserved top-level extras

- `variations: []` — WP-style presets (reserved empty; populate when designers actually ask).
- `textdomain: "chadpress"` — i18n domain. Control labels stay plain strings until Phase 3 wires `@wordpress/i18n`.

## Styling policy: when to use CLI vs CVA

| Situation | Action |
|---|---|
| shadcn registry has the component (e.g. `button`, `input`, `card`) | `pnpm dlx shadcn@latest add <name>` from `apps/web` — writes into `packages/ui/src/components/ui/` via `components.json` aliases. |
| shadcn *explicitly does not ship* the component (e.g. `typography`) | Do **not** author a fake "shadcn" component in `src/components/ui/`. Instead, co-locate a `<block>-variants.ts` file in the block folder using `cva` + `cn`, copying the patterns from [shadcn's docs](https://ui.shadcn.com/docs/components/typography). |
| Arbitrary design tokens (spacing, custom shadows) | Use the design system's CSS variables (`--radius`, `--ring`, etc.) defined in `src/globals.css`. Never hardcode values that already live there. |

For **our own blocks**, the component output is still Tailwind utility classes — but authored through contract-bound shadcn/CVA variants and compiled by Tailwind. The rule is not "no Tailwind"; the rule is "no arbitrary configurable Tailwind directly in runtime component logic." `block.json` owns the semantic knobs, and the variant file owns how those knobs become classes.

For **WP core block editor parity**, `src/wp-editor.css` targets WordPress editor DOM classes like `.wp-block-heading` as an adapter only. That CSS exists so Gutenberg preview looks like the frontend. The frontend renderer does not depend on WP's saved HTML classes.

> ⚠️ `npx shadcn add typography` returns **404** by design for `base-nova`. That is not a broken install — see [`heading/heading-variants.ts`](./heading/heading-variants.ts) top-of-file comment. Do not "fix" it by hand-authoring a `typography.tsx` under `src/components/ui/`.

## File layout per block

```
packages/ui/blocks/<block-name>/
  block.json              # the contract ($schema points to ../block.schema.json)
  <Block>.tsx             # pure React, reads styleMap from block.json
  <block>-variants.ts     # optional — cva() variants for design tokens
  types.ts                # export type <Block>Attributes = InferAttributes<typeof block>
  index.ts                # re-exports Component, Attributes type, and meta
```

And in the engine's shared files:

```
packages/ui/blocks/
  block.schema.json       # meta-schema — validates every block.json
  types.ts                # InferAttributes<T>, BlockDefinition
  registry.ts             # blockRegistry map, BlockName type
  index.ts                # barrel re-exports
```

## How to add a new block (the playbook)

1. Create `packages/ui/blocks/<name>/block.json`. Fill all contract layers. Point `$schema` at `../block.schema.json`. Keep `customControls.toolbar/inspector` empty if you don't know what belongs there yet — never invent placeholder controls. For core shadow blocks, set `customEditor.source: "core"` and disable any WP supports the frontend does not intentionally render.
2. Create `types.ts`:
   ```ts
   import type { InferAttributes } from "../types"
   import blockMeta from "./block.json"
   export type <Name>Attributes = InferAttributes<typeof blockMeta>
   ```
3. If any attribute needs design variants, create `<name>-variants.ts` with a `cva()`. Keys in the CVA variants **must** match the semantic tokens in `block.json` `customTailwind.styleMap`.
4. Create `<Name>.tsx`. Read `styleMap` from `block.json`. Apply classes only via the CVA + the JSON's `className` escape hatch. No bare Tailwind strings.
5. Create `index.ts`:
   ```ts
   import { <Name> } from "./<Name>"
   export type { <Name>Attributes } from "./types"
   export { <Name> }
   export { default as <name>Meta } from "./block.json"
   ```
6. Register in [`registry.ts`](./registry.ts):
   ```ts
   import { <Name>, <name>Meta, type <Name>Attributes } from "./<name>"
   const core<Name>: BlockDefinition<typeof <name>Meta, <Name>Attributes> = {
     Component: <Name>,
     meta: <name>Meta,
   }
   export const blockRegistry = {
     "core/heading": coreHeading,
     "core/<name>":  core<Name>,
   } as const
   ```
7. Update [`blocks/index.ts`](./index.ts) to `export * from "./<name>"`.
8. Run `pnpm exec tsc --noEmit` inside `packages/ui`. Zero errors.

## How `InferAttributes<T>` works

`block.json` is imported as a typed module (`resolveJsonModule: true`). The generic maps each `{ type: "string" }` entry to its TS counterpart. Rename an attribute in JSON → every consumer breaks at compile time, which is what we want.

```ts
// Given
{ "attributes": { "content": { "type": "string" }, "level": { "type": "number" } } }

// You get
type XAttributes = { content: string; level: number }
```

If you need a literal union (e.g. `textAlign: "left" | "center" | "right"`), narrow at the point of use — do **not** try to encode unions in `block.json` (WP's attribute schema doesn't support it natively).

## The registry

`blockRegistry` in [`registry.ts`](./registry.ts) is the **one object** consumed by these touchpoints:

- **`apps/wp-plugin`:** For core shadows, enqueues `editor.css` into Gutenberg so admin preview matches shared tokens (no extra `register_block_type` from us). For custom `chadpress/*` blocks, reads mounted `block.json` declarations and runs `register_block_type`; the editor bundle imports the same meta + pure React components and builds controls from `customControls`.
- **`apps/web`:** Resolves `blockRegistry[block.name as BlockName]` in `BlockRenderer` / GraphQL-driven render path.
- **Any other runtime** (e.g. Storybook) can reuse the same map.

Each entry is typed with `BlockDefinition<MetaShape, AttrShape>` for per-block type safety. If you need runtime validation of incoming data against the meta, use ajv + `block.schema.json` — don't bolt on ad-hoc checks.

## The `.cursorrules` pointer

`/monorepo/.cursorrules` references this file. Future agents reading `.cursorrules` will land here before touching a block. Keep this document current — it is the contract for how contracts get written.

## Things we explicitly DON'T do (YAGNI reservations)

- Responsive styleMap (`md`/`lg` breakpoints in JSON). Add only when a block actually needs breakpoint-aware variants.
- Filesystem-glob auto-discovery in the universal React registry. Explicit `blockRegistry` entries stay grep-able and type-safe. The WP plugin may still glob mounted `block.json` files for PHP registration, because WordPress registration is disk-metadata driven.
- CSS-variable-driven block styling. The theme already owns those via `globals.css`; the contract owns semantic tokens, not raw color math.
- Inline rich-text editor logic in components. `richText: true` is a *flag* for Phase 3; the Phase 2 component just renders a string.

## Layout: use `core/group` and `core/columns` (not custom wrappers)

**Do not** add Chadpress-only layout container blocks. WordPress’s **Group** (flow, row, stack, grid) and **Columns / Column** own the editor experience and the serialized `layout` / `width` attributes. We supply **shadow** declarations in [`group/`](./group/), [`columns/`](./columns/), and [`column/`](./column/) and map those attributes to Tailwind in the React layer — see `group-layout.ts` and the Columns/Column components.

Object attributes such as `layout` and `style` may arrive from WPGraphQL Content Blocks as **JSON strings**; [`applyAttributeDefaults`](./runtime.ts) (see `parseBlockObjectAttr`) coerces them to objects before components read them.

## Reference: the `heading` block

[`heading/block.json`](./heading/block.json) is the canonical example. When adding a second block, mimic its shape — don't reinvent the structure.

## Next.js universal block renderer (`apps/web`)

The web app resolves every route as a WordPress URI (`/` → `/`, `/about` → `/about/`) and fetches that `contentNode` from WPGraphQL. It dispatches `editorBlocks` on `block.name` into `blockRegistry`.

The GraphQL attribute fields are **generated from each block’s `block.json`** (`getBlockAttributeKeys` on registry `meta`), and defaults are applied with `applyAttributeDefaults` — not a hand-written parallel type in `apps/web`. Adding a future core block should be: shadow declaration + component + registry entry; the universal route stays unchanged.

See [`apps/web/README.md`](../../../apps/web/README.md) and [`apps/web/src/lib/wp-block-query.ts`](../../../apps/web/src/lib/wp-block-query.ts).
