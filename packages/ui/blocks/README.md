# Chadpress Declaration Engine

> Source of truth for **how blocks are authored** in this monorepo. Read this before creating, modifying, or refactoring any block. If you find yourself wanting to break one of these rules, update this document first — don't silently diverge.

## Prime directive

**`block.json` is the law.** It is the single source of truth for a block's data shape, styling tokens, and editor UX. Every other artifact — TypeScript types, React components, WP `edit.js`, Next.js renderer — must be derived from (or conform to) it. Declare once, consume everywhere.

## Mapping WordPress **core** blocks (shadow declarations)

> **Fas 3+:** Förstå denna *innan* du föreslår `register_block_type` eller egen Gutenberg-`edit.js`.

**WordPress core** (`core/heading`, `core/paragraph`, `core/image`, …) ger oss redan: Gutenberg-UI, serialisering, klistra från Word, tillgänglighet, översättning, och (med **WPGraphQL + WPGraphQL Content Blocks**) automatiskt GraphQL-schema för `editorBlocks` med attribut-typer.

Vår mappstrategi:

1. **Ingen egen `register_block_type` för samma block** — såvida vi inte ersätter core med goda skäl. Vi använder WPs block som datakälla.
2. **Skugg-deklaration** i monorepoot: mappen `packages/ui/blocks/heading/` (o.s.v.) innehåller en `block.json` vars `name` matchar exakt WPs, t.ex. `"core/heading"`. Fält som `attributes` speglar en **äkta delmängd** av WPs block-attribut (så vår frontend vet vad som gäller). `customControls.toolbar` / `inspector` är ofta `[]` — WordPress *är* redan `customControls` i editorn när man råkar core.
3. **Join-nyckel** mellan världar är `block.name` + samma attributsnamn. GraphQL svarar med `{ name: "core/heading", attributes: { content, level, textAlign } }`; Next (fas 4) kör `blockRegistry["core/heading"].Component(attrs)`.
4. **Design ligger hos oss:** `customTailwind.styleMap` och `customControls` följer fortfarande vår meta-schema, men värden som färdas i GraphQL är **endast** attribut som WP faktiskt sparar. För 1:1 Gutenberg-iframe preview injicerar `apps/wp-plugin` samma design tokens in i admin via `add_editor_style()` (byggd från `packages/ui` → `chadpress-ui/dist/editor.css`, se DDEV volym) — mappat mot WPs DOM (`.wp-block-heading`, `has-text-align-center`, m.m. i `src/wp-editor.css`).
5. **När skapa vi eget block?** Endast när WPs katalog *inte* täcker vårt use case, eller när vi medvetet byter bort en core-implementation. Varje sådant val dokumenteras här + i relevant `block.json` `description`.

**Playbook för nästa kärnblock (t.ex. `core/paragraph`):** samma 8-steg som nedan, men hoppa över steg 6 *registret* om du *bara* förlitar dig på WPs inbyggda block (registret fylls ändå med samma `name` så fas-4-rendering kan slås upp). Lägg till CVA/`-variants.ts` + uppdatera `src/wp-editor.css` så iframen får 1:1-typografin.

**Registret vs WP (fas 3):** `blockRegistry` används i **Next.js** för att slå upp `Component`, inte för att *registrera* något i WordPress. WP-pluginet behöver **inte** iterera registret så länge vi använder core-block — i stället laddar det bara editor-CSS. Om vi senare låter pluginet auto-registrera *custom* block, återgår vi till `register_block_type` + `block.json` från disken.

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

`blockRegistry` in [`registry.ts`](./registry.ts) is the **one object** consumed by three future touchpoints:

- **Phase 3 (`apps/wp-plugin`)** — så länge vi mappar **core**-block: enqueues `editor.css` in i Gutenberg så att admin-preview följer samma tokens som `Heading.tsx` (ingen `register_block_type`, ingen `edit.js` från vår sida). För *custom* `chadpress/*` blocks läser pluginet monterade `block.json`-deklarationer och kör `register_block_type`; editor-bundlen importerar samma blockmeta + pure React-komponenter och genererar controls från `customControls`.
- **Phase 4 (`apps/web`)** will do `const { Component } = blockRegistry[block.name as BlockName]` in its GraphQL renderer.
- **Any future runtime** (e.g. email templates, Storybook) consumes the same map.

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

## Phase 4 — Next.js universal block renderer

The web app (`apps/web`) resolves every route as a WordPress URI (`/` → `/`, `/about` → `/about/`) and fetches that `contentNode` from WPGraphQL. It then dispatches `editorBlocks` on `block.name` into `blockRegistry`.

The GraphQL attribute fields are **generated from each block’s `block.json`** (`getBlockAttributeKeys` on registry `meta`), and defaults are applied with `applyAttributeDefaults` — not a hand-written parallel type in `apps/web`. Adding a future core block should be: shadow declaration + component + registry entry; the universal route stays unchanged.

See [`apps/web/README.md`](../../../apps/web/README.md) and [`apps/web/src/lib/wp-block-query.ts`](../../../apps/web/src/lib/wp-block-query.ts).
