# Chadpress block engine

This directory is the source of truth for block contracts and shared rendering. Chadpress uses an all-custom architecture: every authored block is named `chadpress/*`. Do not add `core/*` declarations, core-block shadows, or adapters that reproduce Gutenberg markup.

**Planning:** [Image / media block — MVP plan & full-product gaps](./docs/image-media-block.md)

## Architecture

`block.json` defines a block's public contract. Code generation places it in `blockRegistry`, and the same pure React component from `packages/ui` renders it in both runtimes:

- The WordPress editor passes `RichText` nodes as named slots and `InnerBlocks` as child content.
- The Next.js frontend passes persisted attributes and rendered child blocks into that component.

Block components must not import WordPress or Next.js APIs. Runtime-specific registration, editing, GraphQL, and routing stay in their apps.

WordPress exposes only the registered `chadpress/*` block names through its block allowlist. Layout is also custom: use `chadpress/section`, `chadpress/columns`, and `chadpress/column`; do not fall back to Core Group or Columns.

## Contract

Every `packages/ui/blocks/<slug>/block.json` must include:

- `name`: exactly `chadpress/<slug>`.
- `attributes`: the complete persisted data shape.
- `supports`: inner-block policy, allowed child block names, and template.
- `capabilities`: shared behavior such as `align` and `spacing`.
- `customTailwind`: semantic attribute-value mappings and the wrapper class escape hatch.
- `customControls`: complete toolbar and inspector controls.
- `customEditor`: custom-editor policy, including optional splitting behavior.
- `example.attributes`: valid representative data used by `/dev/blocks`.
- `example.innerBlocks`: optional nested fixtures for container and compound blocks.
- `variations`: WordPress variations, usually `[]`.

The contract, controls, component, GraphQL attributes, and example must agree. Do not expose a setting in WordPress unless it is persisted and rendered on the frontend.

### Rich-text slots

Rich text is declared per attribute:

```json
"content": {
  "type": "string",
  "default": "",
  "richText": true,
  "tagName": "p",
  "placeholder": "Write text…"
}
```

Each `richText: true` attribute becomes a named editor slot. A component renders `slots?.content` when editing and the persisted HTML attribute when no slot is supplied. Blocks may have any number of slots; for example, Quote has separate quote and citation slots. Keep slot placement inside the shared component so editor and frontend use the same anatomy.

### Capabilities

Capabilities are closed, shared bundles declared once in `capabilities.json` — attributes, controls, and value-to-class maps. `capabilities.ts` exposes them to both runtimes, the contract validator checks them, and the WordPress plugin reads the same file to expand registered block attributes:

- `align` adds the alignment attribute, toolbar control, and alignment class mapping.
- `spacing` adds the spacing attributes, inspector controls, and spacing classes.

Use capabilities instead of copying common attributes or controls into individual blocks. To add or change a capability, edit `capabilities.json` only; never redeclare its data in TypeScript or PHP.

### Controls

`customControls.toolbar` and `customControls.inspector` use the closed vocabulary implemented by the editor resolver: `select`, `toggle`, `text`, `alignment`, `headingLevel`, and `link`.

Every control must bind an explicit attribute or an effective attribute supplied by a declared capability. Its options must cover the supported values. Never invent a control type in one contract; add it to the schema, types, editor resolver, and validation first.

### Flat GraphQL

The web app requests `editorBlocks(flat: true)` once, including `clientId`, `parentClientId`, block name, and declared attributes. It rebuilds the tree from IDs before rendering through `blockRegistry`. Do not restore recursive fragments, fixed-depth queries, or `renderedHtml` fallback rendering.

## Block anatomy

```text
packages/ui/blocks/<slug>/
  block.json              # complete contract and gallery example
  <Name>Block.tsx         # pure shared React renderer
  <slug>-variants.ts      # optional CVA semantic variants
  types.ts                # InferAttributes<typeof blockMeta>
  index.ts                # component, type, and metadata exports
```

Shared engine files include `block.schema.json`, `capabilities.ts`, `types.ts`, `runtime.ts`, `registry.ts`, `layout-ancestors.ts`, and generated `generated-registry.ts` / `index.ts`. Generated files must not be hand-maintained.

Components own their complete DOM anatomy. They accept attributes, optional rich-text `slots`, and optional child content. Configurable classes must come from contract-bound CVA variants, capabilities, or the declared wrapper class; keep runtime-specific logic out.

## Authoring workflow

From `packages/ui`:

```sh
node scripts/create-block.mjs <slug> "<Title>"
pnpm generate:registry
pnpm validate:contracts
```

The scaffolder creates the canonical contract, component, type, and export files without overwriting an existing block, then regenerates registry outputs. Use `pnpm generate:registry` after adding, deleting, or renaming block folders. `pnpm validate:contracts` regenerates outputs, validates every contract and cross-reference, and type-checks the package. The root validation/build pipeline runs these checks as well.

Agents and contributors must follow this sequence:

1. **Contract:** decide block anatomy, attributes, rich-text slots, capabilities, controls, children, and `example.attributes`.
2. **Scaffold:** run `create-block.mjs`; do not copy an old block by hand.
3. **Implement:** build the pure shared component and any semantic variants.
4. **Validate:** run generation and contract validation; fix every error.
5. **Verify:** open `/dev/blocks`, inspect the example through the real renderer, and take a gallery screenshot for visual review.

The gallery is the required feedback loop, not a separate fixture system. Keep `example.attributes` realistic, use `example.innerBlocks` to exercise container anatomy, and update the fixture whenever the contract changes.

### Benchmark page

`pnpm benchmark:sync` (from `packages/ui`) serializes every block's example fixture into Gutenberg markup and upserts the WordPress benchmark page. The page is a derived artifact — the WordPress twin of `/dev/blocks` — used to verify end-to-end parity: WordPress parsing, GraphQL, the frontend renderer, and the Gutenberg canvas all render the same fixture tree. Never edit the page in the editor; change the `example` in `block.json` and re-sync.
