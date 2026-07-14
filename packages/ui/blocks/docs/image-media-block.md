# Image / media block — MVP plan & full-product gaps

Planning document for adding native WordPress media library support to the Chadpress block collection. Based on a codebase deep dive (July 2026).

**Scope of this doc**

- **Part A** — MVP implementation plan for `chadpress/image`
- **Part B** — Gaps and deferred work for a fully finished media product

---

## Context

Chadpress is a contract-driven block engine: every `chadpress/*` block is defined by `block.json`, rendered by a pure React component in `packages/ui`, edited through a generic Gutenberg resolver in `apps/wp-plugin/src/index.tsx`, and consumed on the frontend via flat WPGraphQL `editorBlocks`.

Today there are **13 blocks**, all text/layout. There is **no media block**, **no media control type**, and **no GraphQL media fetching** in the Next.js app. Core blocks (including `core/image`) are intentionally blocked by the plugin allowlist.

WordPress core media infrastructure (library modal, uploads, attachment post type, local `wp-content/uploads`) and WPGraphQL `MediaItem` APIs exist but are **unused** by Chadpress application code.

---

# Part A — MVP plan (`chadpress/image`)

## MVP goal

Ship a **`chadpress/image` leaf block** that:

1. Lets editors pick or upload images through the **native WordPress media library**
2. Persists attachment-backed attributes in block comments
3. Renders identically on the Gutenberg canvas and Next.js frontend via the shared component
4. Participates in the existing flat GraphQL → `BlockRenderer` pipeline without special cases

### Explicitly out of MVP scope

- Video, audio, file, or embed blocks
- Responsive `srcset` / `mediaDetails` GraphQL field
- `imageAlign` capability (wide/full/float) — use basic layout only
- `next/image` optimization wrapper
- Headless upload from Next.js (`createMediaItem` mutation)
- Missing-attachment recovery UI beyond rendering from denormalized `url`
- S3 / CDN / offload plugins

---

## MVP contract (`chadpress/image`)

### Attributes

| Attribute   | Type    | Default   | Notes |
|------------|---------|-----------|-------|
| `id`       | integer | `0`       | WordPress attachment ID; `0` = empty |
| `url`      | string  | `""`      | Denormalized at pick time; frontend primary render source |
| `alt`      | string  | `""`      | Synced from attachment on pick; editable in inspector |
| `mediaWidth`  | number  | `0`       | Intrinsic width from attachment (not `width` — conflicts with layout blocks in flat GraphQL) |
| `mediaHeight` | number  | `0`       | Intrinsic height from attachment |
| `sizeSlug` | string  | `"large"` | WP image size used when resolving `url` |
| `caption`  | string  | `""`      | Rich-text slot (`tagName: figcaption`) |
| `objectFit`| string  | `"cover"` | Semantic CVA: `cover`, `contain`, `fill` |
| `linkUrl`  | string  | `""`      | Optional link wrapper; empty = no link |

One attribute carries the **media binding flag** (new contract extension):

```json
"id": {
  "type": "integer",
  "default": 0,
  "media": true
}
```

Only one attribute per block should have `"media": true`. The editor uses it as the anchor for MediaPlaceholder / MediaUpload; selecting media writes to all related attrs (`id`, `url`, `alt`, `mediaWidth`, `mediaHeight`).

### Capabilities (MVP)

- **`spacing`** — padding on the figure wrapper (reuse existing capability)
- **Not** `align` — text alignment classes are wrong for block-level images; defer to Phase 2 `imageAlign`

### Controls (MVP)

| Location   | Control | Bind        | Purpose |
|-----------|---------|-------------|---------|
| Inspector | `text`  | `alt`       | Alt text |
| Inspector | `select`| `sizeSlug`  | `thumbnail`, `medium`, `large`, `full` |
| Inspector | `select`| `objectFit` | `cover`, `contain`, `fill` |
| Inspector | `link`  | `linkUrl`   | Optional href |

Media pick/replace/remove is **not** a closed control type in MVP — it is driven by the `media: true` attribute flag and block-level editor chrome (placeholder + toolbar).

### Supports

```json
"supports": {
  "innerBlocks": false,
  "allowedBlocks": [],
  "template": [],
  "html": false
}
```

### Example fixture

Use a stable public image URL (or a known DDEV upload URL documented in the fixture comment) so `/dev/blocks` and benchmark sync work offline from WP:

```json
"example": {
  "attributes": {
    "id": 0,
    "url": "https://picsum.photos/seed/chadpress-image/800/450",
    "alt": "Sample landscape",
    "width": 800,
    "height": 450,
    "sizeSlug": "large",
    "caption": "Image block example caption",
    "objectFit": "cover",
    "linkUrl": ""
  }
}
```

---

## MVP architecture

```text
block.json (media: true on id)
       │
       ├─► block.schema.json          (+ media attribute flag)
       ├─► capabilities.ts            (unchanged for MVP)
       ├─► generated-registry.ts      (pnpm generate:registry)
       ├─► chadpress.php              (auto-discovered)
       │
       ├─► apps/wp-plugin/index.tsx   (MediaPlaceholder + MediaUpload)
       │         │
       │         └─► sets id, url, alt, width, height, sizeSlug
       │
       ├─► packages/ui/image/Image.tsx  (pure <figure>/<img>/<figcaption>)
       │
       └─► wp-block-query.ts          (auto-includes new attribute keys)
                 └─► BlockRenderer → Image.tsx
```

### Editor behavior spec

| State | UX |
|-------|-----|
| **Empty** (`id === 0` or `url === ""`) | Full-block `MediaPlaceholder`: Upload, Media Library, drag-and-drop |
| **Populated** | Shared `Image` component as canvas preview |
| **Block toolbar** | Replace image, Remove image |
| **Inspector** | Alt, size slug, object fit, link URL |
| **Caption** | Inline `RichText` via existing slot machinery (`caption` attribute) |
| **On select** | Write attachment fields; resolve `url` from chosen `sizeSlug` |
| **On replace** | Same as select; overwrite attrs |
| **On remove** | Reset media attrs to defaults; keep caption/link if desired (decision: clear all media attrs only) |
| **Save** | `null` (dynamic block) |

### Frontend behavior spec

| Condition | Output |
|-----------|--------|
| No `url` | Render nothing (fragment / null) |
| Has `url` | `<figure>` → optional `<a href={linkUrl}>` → `<img>` → optional `<figcaption>` |
| Missing `alt` | `alt=""` (editor shows soft warning, not blocking) |

### Parent allowlist updates

Add `"chadpress/image"` to `allowedBlocks` in:

- `packages/ui/blocks/section/block.json`
- `packages/ui/blocks/column/block.json`
- `packages/ui/blocks/card-content/block.json`

---

## MVP implementation tasks

Tasks are ordered by dependency. Each task lists **files**, **work**, and **acceptance criteria**.

### Task 1 — Extend the block contract schema

**Files**

- `packages/ui/blocks/block.schema.json`

**Work**

1. Add optional `"media": { "type": "boolean" }` to the attribute spec (alongside `richText`, `tagName`, `placeholder`).
2. Add validation rule: at most one attribute with `"media": true` per block (enforce in `validate-block-contracts.mjs` if not JSON-schema expressible).

**Acceptance criteria**

- [ ] Existing 13 blocks still pass `pnpm validate:contracts`
- [ ] A block with `"media": true` on an attribute validates successfully
- [ ] A block with two `"media": true` attributes fails validation with a clear error

---

### Task 2 — Extend TypeScript attribute types

**Files**

- `packages/ui/blocks/capabilities.ts` (or `types.ts` if `BlockAttributeSpec` lives there)

**Work**

Add `media?: boolean` to `BlockAttributeSpec`.

**Acceptance criteria**

- [ ] `@repo/ui` type-check passes
- [ ] No changes to existing block types required beyond spec compatibility

---

### Task 3 — Scaffold and implement `chadpress/image`

**Files**

- `packages/ui/blocks/image/block.json`
- `packages/ui/blocks/image/Image.tsx`
- `packages/ui/blocks/image/image-variants.ts`
- `packages/ui/blocks/image/types.ts`
- `packages/ui/blocks/image/index.ts`

**Work**

1. Scaffold: `node scripts/create-block.mjs image "Image" --icon format-image --description "..."`.
2. Replace scaffold contract with full MVP contract (attributes, controls, capabilities, example).
3. Implement `Image.tsx`:
   - Props: all attributes + optional `className`, `slots?: { caption?: ReactNode }`
   - Early return `null` when `!url`
   - `<figure className={cn(spacing, wrapper)}>`
   - Optional link wrapper when `linkUrl` is non-empty
   - `<img src={url} alt={alt} width={width || undefined} height={height || undefined} className={objectFitVariant} />`
   - Caption: render `slots?.caption` in editor, `dangerouslySetInnerHTML` on frontend
4. CVA for `objectFit` in `image-variants.ts`; map via `customTailwind.styleMap`.
5. Run `pnpm generate:registry`.

**Acceptance criteria**

- [ ] `pnpm validate:contracts` passes (styleMap tokens match CVA)
- [ ] `/dev/blocks` renders the example fixture
- [ ] Component has zero `@wordpress/*` or `next/*` imports

---

### Task 4 — Wire native media library in the Gutenberg editor

**Files**

- `apps/wp-plugin/package.json` — add `@wordpress/media-utils` as devDependency (align version with other `@wordpress/*` packages)
- `apps/wp-plugin/src/index.tsx`

**Work**

1. Import `MediaPlaceholder`, `MediaUpload`, `MediaUploadCheck` from `@wordpress/block-editor`.
2. Import `uploadMedia` from `@wordpress/media-utils` (for placeholder upload handler).
3. In `GenericBlockEdit` (or a dedicated helper), detect the attribute with `media: true`.
4. **Empty state:** render `MediaPlaceholder` instead of (or overlaying) the shared component:
   - `onSelect` → map WP media object to block attrs
   - `onUpload` → `uploadMedia` then select result
   - `allowedTypes={['image']}`
   - `labels={{ title: 'Image', instructions: '…' }}`
5. **Populated state:** render shared component + block toolbar controls:
   - Replace → `MediaUpload` with `render={({ open }) => …}`
   - Remove → reset media attrs to defaults
6. **Size slug change:** when inspector changes `sizeSlug`, re-resolve `url` from attachment sizes if `id` is set (editor-only helper using media object from last select, or re-fetch via `wp.media.attachment(id)`).
7. Rebuild plugin: `pnpm --filter wp-plugin build`.

**Media object mapping (reference)**

```ts
function mediaToAttributes(media: WPMedia, sizeSlug: string) {
  const sizeUrl = media.sizes?.[sizeSlug]?.url ?? media.url;
  return {
    id: media.id,
    url: sizeUrl,
    alt: media.alt ?? "",
    width: media.width ?? 0,
    height: media.height ?? 0,
    sizeSlug,
  };
}
```

**Acceptance criteria**

- [ ] Empty image block shows native upload + media library entry points
- [ ] Selecting an image from the library populates preview and persists on save
- [ ] Uploading a new file creates an attachment and populates the block
- [ ] Replace and Remove work from block toolbar
- [ ] Caption rich text still editable inline when image is set
- [ ] Inspector controls (alt, size, objectFit, link) function correctly
- [ ] Saved post content contains block comment JSON with all attributes
- [ ] Only images are selectable (`allowedTypes: ['image']`)

---

### Task 5 — Update parent block allowlists

**Files**

- `packages/ui/blocks/section/block.json`
- `packages/ui/blocks/column/block.json`
- `packages/ui/blocks/card-content/block.json`

**Work**

Add `"chadpress/image"` to each `supports.allowedBlocks` array.

**Acceptance criteria**

- [ ] Image block appears in inserter inside Section, Column, and Card Content
- [ ] `pnpm validate:contracts` passes

---

### Task 6 — GraphQL and frontend verification

**Files**

- No query changes expected (auto-generated fragments)
- Optional: `apps/web/src/lib/wp-block-query.test.ts` — add normalization test for image attrs

**Work**

1. Insert image block in WP editor on a test page; save.
2. Confirm GraphQL returns `ChadpressImage { attributes { id url alt … } }`.
3. Confirm Next.js page renders the image.

**Acceptance criteria**

- [ ] Flat GraphQL query includes all image attribute keys without manual fragment edits
- [ ] `normalizeEditorBlock('chadpress/image', …)` applies defaults correctly
- [ ] Frontend renders image on a real WP-sourced page

---

### Task 7 — Tests, gallery, and benchmark

**Files**

- `packages/ui/blocks/image/Image.test.tsx` (optional but recommended)
- `packages/ui/blocks/runtime.test.ts` or similar if attribute defaults need coverage

**Work**

1. Unit test: renders null without url; renders figure/img with url; renders caption slot vs HTML.
2. Screenshot `/dev/blocks` gallery entry.
3. Run `pnpm --filter @repo/ui benchmark:sync`.
4. Verify `/chadpress-benchmark` on frontend and Gutenberg canvas (agent login per runbook).

**Acceptance criteria**

- [ ] `pnpm --filter @repo/ui test` passes
- [ ] `pnpm --filter @repo/ui validate:contracts` passes
- [ ] Benchmark page includes image block example
- [ ] Visual parity: gallery ≈ benchmark frontend ≈ Gutenberg canvas

---

### Task 8 — Documentation and runbook touch-up

**Files**

- `packages/ui/blocks/README.md` — link to this doc
- `monorepo/.cursorrules` — optional one-line note that `media` attribute flag exists (if agents need awareness)

**Acceptance criteria**

- [ ] README points to `docs/image-media-block.md`
- [ ] Runbook “after changing X” still accurate (wp-plugin build required for editor changes)

---

## MVP verification checklist

Run in order after all tasks:

```sh
# From monorepo/packages/ui
pnpm generate:registry
pnpm validate:contracts
pnpm test

# Rebuild editor bundle
pnpm --filter wp-plugin build

# Sync benchmark page
pnpm --filter @repo/ui benchmark:sync
```

Manual:

1. `/dev/blocks` — image example renders
2. WP editor — insert image, upload, pick from library, set caption/alt/link, save
3. `ddev wp post get <id> --field=post_content` — attrs in block comment
4. Frontend page — image visible with correct alt and caption
5. `/chadpress-benchmark` — parity check

---

## MVP risks and mitigations

| Risk | Mitigation |
|------|------------|
| `@wordpress/media-utils` version skew | Pin to same major/minor family as `@wordpress/block-editor` |
| Media scripts not loaded in editor iframe | Use `MediaUploadCheck`; test in real Gutenberg canvas iframe |
| Size slug change without attachment object | Store last selected sizes in editor state or fetch via `wp.media.attachment(id)` |
| External example URL blocked in WP | Benchmark fixture may need a real uploaded asset; document in example comment |
| GraphQL integer `id` type mismatch | Confirm WPGraphQL Content Blocks maps `integer` attrs; adjust to `number` if needed |

---

## MVP estimated effort

| Task | Estimate |
|------|----------|
| 1–2 Schema + types | 0.5 day |
| 3 Shared component + contract | 1 day |
| 4 Editor media integration | 1.5–2 days |
| 5–6 Allowlists + GraphQL verify | 0.5 day |
| 7–8 Tests + docs + benchmark | 0.5–1 day |
| **Total** | **~4–5 days** |

---

# Part B — Full-product gaps

Everything below is **intentionally deferred** from MVP. This section is the backlog for a complete media experience in Chadpress.

## B1. Block surface area

| Gap | Description | Why deferred |
|-----|-------------|--------------|
| **`chadpress/video`** | Attachment-backed or embed URL video with poster | Different media library filters, DOM (`<video>`), controls |
| **`chadpress/file`** | Downloadable file block (PDF, etc.) | Different UX and accessibility requirements |
| **Generic `chadpress/media`** | Single block with `mediaType` discriminator | Harder to validate and style; split blocks are clearer |
| **Image block variations** | Round, bordered, shadow presets | Needs design tokens and variation contract |
| **Gallery / multi-image** | Grid of images or inner block container | Composition pattern decision (container vs array attr) |

## B2. Layout and capabilities

| Gap | Description | Notes |
|-----|-------------|-------|
| **`imageAlign` capability** | Block-level left/center/right/wide/full | Current `align` capability applies text classes; images need figure-level layout |
| **Aspect ratio control** | Fixed ratio presets (16:9, 1:1, etc.) | Requires CVA + possibly object-fit coordination |
| **Width / height override** | Display dimensions vs intrinsic | Core supports resize handles; significant editor work |
| **Lightbox / zoom** | Click to expand | Frontend interaction layer in `apps/web` |

## B3. Media library integration (advanced)

| Gap | Description | Notes |
|-----|-------------|-------|
| **`media` control type** | Closed-vocabulary inspector control for re-pick | MVP uses attribute flag + toolbar; formal control type needed for consistency |
| **Focal point** | Crop focal point for object-fit | WordPress core feature; attr + editor UI |
| **Hotspot / crop** | Custom crop rectangle | High complexity |
| **Bulk replace** | Update all blocks referencing attachment ID | Requires find/replace tooling |
| **Missing attachment UX** | Editor warning when `id` invalid but `url` present | MVP silently falls back to url |
| **Alt text required enforcement** | Block validation / publish guard | Accessibility policy decision |
| **Media library restrictions** | MIME types, max size, per-role | PHP filters + editor config |

## B4. GraphQL and data layer

| Gap | Description | Notes |
|-----|-------------|-------|
| **`mediaDetails` field** | Responsive sizes via attachment ID | Mirror `CoreImage.php` in `chadpress.php` for `ChadpressImage` |
| **`srcset` / `sizes` on frontend** | Performance | Depends on `mediaDetails` or denormalized size map |
| **Nested MediaItem query** | Fetch full `MediaItem` by ID in Next.js | Breaks strict flat-only pattern; avoid unless necessary |
| **Featured image on pages/posts** | `featuredImage { node { … } }` in page query | Separate from block media; needed for SEO/OG |
| **Headless upload** | `createMediaItem` mutation from Next.js | WPGraphQL mutation exists; needs auth, CORS, file upload UI |

## B5. Frontend / Next.js

| Gap | Description | Notes |
|-----|-------------|-------|
| **`next/image` wrapper** | Optimized images with remote loader | Requires `remotePatterns` in `next.config.ts` for WP domain |
| **Blur placeholder / LQIP** | Loading UX | Needs extra metadata or CDN |
| **CDN / domain rewriting** | Production asset URLs | Environment-specific URL normalization |
| **SVG policy** | Allow or sanitize SVG uploads | Security consideration |

## B6. Storage and infrastructure

| Gap | Description | Notes |
|-----|-------------|-------|
| **S3 / object storage** | Offload uploads from local disk | No offload plugin in current DDEV setup |
| **Image optimization pipeline** | WebP/AVIF generation, compression | WP plugins or external service |
| **Multi-environment uploads** | DDEV vs staging vs prod URL consistency | Config + `url` rewriting |
| **Backup / migration** | Media + content together | Operational concern |

## B7. Contract engine and validation

| Gap | Description | Notes |
|-----|-------------|-------|
| **Media attribute cross-validation** | If `id > 0`, require non-empty `url` | Validator rule in `validate-block-contracts.mjs` |
| **URL format validation** | Ensure persisted urls are safe | SSRF / XSS hardening |
| **Example fixture from real attachment** | Benchmark uses live WP media ID | May need benchmark sync to upload fixture image first |
| **Scaffold template for media blocks** | `create-block.mjs --media` flag | DX improvement |

## B8. Editor UX parity with core/image

| Core feature | Chadpress MVP | Full product |
|--------------|---------------|--------------|
| Media library pick | Yes | Yes |
| Direct upload | Yes | Yes |
| Alt text | Inspector text | + required validation |
| Caption | Rich text | Yes |
| Link | Inspector URL | + open in new tab toggle |
| Alignment (wide/full) | No | `imageAlign` capability |
| Resize handles | No | Display dimension attrs |
| Size slug | Inspector select | + live preview on change |
| Lazy load | No | Frontend attribute / default |
| srcset | No | `mediaDetails` GraphQL |
| Focal point | No | Phase 3 |
| Replace while preserving caption | Partial | Explicit UX decision |

## B9. Testing and observability

| Gap | Description |
|-----|-------------|
| **E2E editor test** | Playwright: upload → save → GraphQL → frontend |
| **Visual regression** | Image block in gallery per PR |
| **Attachment orphan audit** | CLI to find unused uploads |
| **GraphQL contract test** | Snapshot of `ChadpressImage` fragment |

---

## Recommended phase map (post-MVP)

```text
Phase 2 — Image polish
  • imageAlign capability
  • mediaDetails GraphQL + srcset
  • missing attachment editor warning
  • next/image optional wrapper

Phase 3 — Extended media types
  • chadpress/video
  • featured image in page queries

Phase 4 — Headless media ops
  • createMediaItem from authenticated Next.js admin
  • CDN / offload integration
  • focal point + advanced crop
```

---

## Decision log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07 | MVP block name: `chadpress/image` | Matches scope; video/file are separate blocks |
| 2026-07 | `media: true` attribute flag vs `media` control type | Flag drives primary placeholder UX; formal control type deferred |
| 2026-07 | Persist both `id` and `url` | ID for library relationship; URL for flat GraphQL frontend render |
| 2026-07 | Defer `align` capability for images | Text align classes incorrect for figure layout |
| 2026-07 | Image dimensions named `mediaWidth` / `mediaHeight` | Flat GraphQL inline fragments conflict when `width` is both `String` (column/section) and `Float` (image) |
| 2026-07 | Plain `<img>` in shared component | Keeps `packages/ui` framework-agnostic |

---

## Implementation status (MVP)

**Shipped:**

- `media: true` attribute flag in `block.schema.json` + validator (max one per block)
- `chadpress/image` block with shared `ImageBlock` component
- Native `MediaPlaceholder` / `MediaUpload` in `apps/wp-plugin/src/index.tsx`
- Parent allowlists updated (section, column, card-content)
- `@wordpress/media-utils` dependency for uploads
- Gallery fixture at `/dev/blocks` and benchmark sync

**Verified:**

- `pnpm validate:contracts` — 16 blocks
- `pnpm test` — `@repo/ui` + `web`
- WP registration via `chadpress_block_declarations()`
- GraphQL `ChadpressImage.attributes` on benchmark page
- Next.js `/chadpress-benchmark` and `/dev/blocks` render the image

---

## References

| Resource | Path |
|----------|------|
| Block engine README | `packages/ui/blocks/README.md` |
| Block schema | `packages/ui/blocks/block.schema.json` |
| Generic editor | `apps/wp-plugin/src/index.tsx` |
| Flat GraphQL query | `apps/web/src/lib/wp-block-query.ts` |
| WP allowlist | `apps/wp-plugin/chadpress.php` |
| Core image GraphQL reference | `wp/wp-content/plugins/wp-graphql-content-blocks/includes/Blocks/CoreImage.php` |
| WPGraphQL media mutations | `wp/wp-content/plugins/wp-graphql/src/Mutation/MediaItemCreate.php` |
| Agent runbook | `monorepo/.cursorrules` |
