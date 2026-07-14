# Chadpress Declaration Engine — Master Prompt for Deep-Dive Analysis

> **Audience:** Fable 5 (or equivalent high-reasoning model)  
> **Mode:** Investigative analysis — **not** an implementation plan  
> **Workspace:** `/home/william/code/chadpress` (monorepo at `monorepo/`)  
> **Instruction:** Use subagents aggressively. Launch parallel investigations wherever domains are independent. Synthesize findings; do not jump to fixes.

---

## Your mission

Perform a rigorous, evidence-based deep dive into whether Chadpress's core philosophy and architecture are sound — and whether they can scale as a **packaged framework** for multiple customers.

**Do not propose a refactor roadmap unless a finding is so severe it blocks viability.** The owner wants truth, trade-offs, and blind spots — not a sprint plan.

Deliver an **investigative report** with:
- Clear verdicts (possible / partially possible / not possible / unknown) per research question
- Evidence from this codebase (file paths, code patterns, concrete failure modes)
- Comparison to established alternatives where relevant
- Risk register ranked by severity × likelihood
- Open questions that require runtime or customer validation

---

## What Chadpress claims to be

Chadpress is a headless WordPress + Next.js monorepo built around a **Declaration Engine**:

1. **`block.json` is the law** — single source of truth for attributes, styling tokens, editor UX, and composition rules.
2. **Shadow declarations for WordPress core blocks** — do *not* re-register `core/heading`, etc. WordPress owns serialization and Gutenberg UI; the monorepo declares matching contracts so Next.js can render with the same attribute model.
3. **Custom `chadpress/*` blocks** when core is insufficient — share **pure React components** between Gutenberg editor and Next.js renderer.
4. **shadcn/Tailwind design system** in `@repo/ui` — same tokens in both runtimes; Gutenberg iframe gets `editor.css` built from the same package.
5. **1:1 representation goal** — what authors see in Gutenberg should match what visitors see on the Next.js frontend, using the same underlying components (for custom blocks) or equivalent styling (for core shadows via `wp-editor.css` adapter).

### Data flow

```text
WordPress (Gutenberg)  ──WPGraphQL Content Blocks──►  Next.js BlockRenderer
       │                                                      │
       │ chadpress-plugin                                     │ blockRegistry lookup
       │   editor.css (iframe preview)                        │ applyAttributeDefaults
       └─ @repo/ui/blocks (pure React) ───────────────────────┘ same components
```

### Five non-negotiables (from project docs)

1. Contract first — no `.tsx` before `block.json`
2. No arbitrary configurable Tailwind in components — must trace to `customTailwind.styleMap` or CVA variants
3. shadcn-native — CLI for registry components; CVA co-located for typography etc.
4. Pure React in `packages/ui` — zero WP/Next imports in block components
5. No logic duplication — shared utils imported by both runtimes

**Read these before investigating:**
- `monorepo/packages/ui/blocks/README.md` — Declaration Engine bible
- `monorepo/.cursorrules` — agent context
- `monorepo/README.md` — architecture overview
- `monorepo/apps/web/README.md` — Next renderer
- `monorepo/apps/wp-plugin/README.md` — WP bridge + DDEV mounts

---

## The three research questions

### Q1 — Is true 1:1 representation actually possible?

**Claim under test:** Authors can achieve a true 1:1 visual and behavioral match between Gutenberg and the Next.js frontend by sharing the same shadcn components (custom blocks) and design tokens (core shadows).

Investigate:

| Layer | What to examine | Key files |
|-------|-----------------|-----------|
| **Custom blocks** | Same `Component` in editor (`apps/wp-plugin/src/index.tsx`) and renderer (`apps/web/src/components/block-renderer.tsx`) | `packages/ui/blocks/button/`, `packages/ui/blocks/card*/` |
| **Core shadows** | Editor uses WP DOM + `wp-editor.css` adapter; frontend uses CVA React components — are these truly equivalent? | `packages/ui/src/wp-editor.css`, `packages/ui/blocks/heading/`, `packages/ui/blocks/paragraph/` |
| **Layout blocks** | WP `layout`/`style` JSON → Tailwind mapping — parity with Gutenberg's own layout engine? | `packages/ui/blocks/group/group-layout.ts`, `packages/ui/blocks/columns/`, `packages/ui/blocks/column/` |
| **Compound blocks** | Card family uses `innerBlocks`, `display: contents`, RichText wrappers — does layout parity hold? | `packages/ui/blocks/layout-ancestors.ts`, `packages/ui/blocks/card/`, `apps/wp-plugin/src/index.tsx` |
| **Design tokens** | Font loading differs (Next `next/font` vs Google Fonts in iframe) — material drift? | `packages/ui/src/globals.css`, `apps/web/src/app/globals.css` |
| **Editor controls** | `customControls` schema defines toolbar types (`alignment`, `headingLevel`, `color`, `link`) but plugin only implements `inspector` with `select`/`toggle`/`text` — does incomplete control generation break 1:1? | `packages/ui/blocks/block.schema.json`, `apps/wp-plugin/src/index.tsx` |
| **disabledSupports** | Core block supports disabled in PHP — are there still Gutenberg controls that persist attributes the frontend ignores? | `apps/wp-plugin/chadpress.php`, each core shadow `block.json` `customEditor` |

**Verdict criteria:**
- **True 1:1 possible** — same components + contract guarantees parity for all declared attributes; gaps are bounded and documented.
- **Partially possible** — parity holds for simple blocks; layout/compound/core-shadow paths require adapter layers that will always drift.
- **Not possible** — fundamental mismatch between WP serialization model and React component model makes 1:1 a misleading goal.

**Compare against:** Faust.js block rendering, WP's `renderedHtml` fallback, full block-theme rendering, Elementor/Webflow-style visual builders, Plasmic/Builder.io component sync.

---

### Q2 — Is something structurally wrong for clean / robust / extensible / scalable systems?

**Claim under test:** The Declaration Engine (`block.json` → registry → dual-runtime consumption) is the right abstraction for complicated and dynamic blocks at scale.

Investigate:

| Concern | Questions | Key files |
|---------|-----------|-----------|
| **Contract schema** | Is `block.schema.json` expressive enough for real blocks? Where does it break (responsive variants, conditional controls, nested attribute shapes, block variations)? | `packages/ui/blocks/block.schema.json`, all `block.json` files |
| **Shadow vs custom split** | Is maintaining two paradigms (core shadows + custom blocks) sustainable? Does every new core block double the work (CVA + wp-editor.css + layout mapper)? | `packages/ui/blocks/README.md` shadow section |
| **Layout mapping complexity** | `group-layout.ts` documents reversed flex-axis bugs fixed to match Gutenberg — is this a sign of fighting WP rather than embracing it? | `packages/ui/blocks/group/group-layout.ts` |
| **Editor auto-generation** | Is generating Gutenberg `edit` from JSON scalable, or will every complex block need bespoke editor code anyway? | `apps/wp-plugin/src/index.tsx` |
| **Registry maintenance** | Explicit `blockRegistry` vs auto-discovery — grep-able and type-safe, or manual toil at 50+ blocks? | `packages/ui/blocks/generated-registry.ts`, `packages/ui/scripts/generate-block-registry.mjs` |
| **GraphQL pipeline** | Fixed 4-level `innerBlocks` depth — silent truncation? Dynamic fragment generation from registry — fragile? | `apps/web/src/lib/wp-block-query.ts` |
| **Runtime normalization** | JSON-string coercion for `layout`/`style` — robust or papering over schema mismatches? | `packages/ui/blocks/runtime.ts` |
| **Dynamic blocks** | Custom leaf blocks `save() → null` — correct for headless, but what does this mean for preview, exports, non-headless fallbacks? | `apps/wp-plugin/src/index.tsx` |
| **Duplication risk** | `apps/wp-plugin/chadpress-ui/` mirrors `packages/ui/` — symlink/mount intended; is drift a real risk? | `apps/wp-plugin/README.md`, DDEV mounts in `wp/.ddev/` |
| **Validation** | `validate-block-contracts.mjs` only deeply validates heading + button — is the contract enforcement story real? | `packages/ui/scripts/validate-block-contracts.mjs` |
| **Testing** | No automated tests found — can this system be robust without visual regression + contract tests? | entire monorepo |

**Stress-test blocks** (read implementations end-to-end):
1. `core/group` — layout JSON → Tailwind (hardest mapper)
2. `chadpress/card` + header/content/footer/title/description — compound innerBlocks
3. `chadpress/button` — custom controls + RichText + CVA variants
4. `core/columns` + `core/column` — responsive stacking + width basis

**Verdict criteria:**
- **Sound** — complexity is inherent to headless WP; architecture contains it well.
- **Sound with caveats** — works for current scope; known ceilings at N blocks / M layout variants.
- **Structurally flawed** — wrong abstraction layer; fighting Gutenberg/WPGraphQL will compound.

**Compare against:** ACF blocks + React, native `block.json` with PHP `render_callback`, `@wordpress/create-block` + separate frontend mapping, Sanity Portable Text, Contentful rich text, Strapi dynamic zones.

---

### Q3 — What's missing for packaging this as a scalable multi-customer framework?

**Claim under test:** Chadpress can be extracted and sold/deployed as a framework where each customer gets the same Declaration Engine with their own blocks, theme, and WP instance.

Investigate:

| Dimension | Questions | Evidence to find |
|-----------|-----------|------------------|
| **Distribution** | All packages `"private": true` — what's needed to publish `@chadpress/ui`, `@chadpress/wp-plugin`, CLI scaffolds? | `package.json` files across monorepo |
| **Customer isolation** | How does a customer add blocks without forking? Theme/token overrides? Block allowlists? | registry pattern, `components.json`, `globals.css` |
| **WP plugin lifecycle** | Bind-mount dev model — production install path? Versioning plugin vs `@repo/ui`? | `apps/wp-plugin/README.md`, `chadpress.php` |
| **Multi-tenant Next** | One Next app serving multiple WP backends? Or one deployment per customer? | `apps/web/src/lib/wordpress.ts`, env config |
| **Upgrade path** | WP core block attribute changes, shadcn style migrations, Gutenberg API changes — who absorbs breakage? | shadow declaration strategy |
| **Authoring UX** | Is Gutenberg the right CMS surface for non-technical customers? Control generation completeness? | `customControls` vs implemented controls |
| **i18n** | `textdomain` exists; labels are plain strings — blocker for EU customers? | all `block.json` files |
| **Observability** | Unsupported block handling (dev warning only) — production behavior? | `apps/web/src/components/block-renderer.tsx` |
| **Security** | RichText HTML from WP → React `dangerouslySetInnerHTML`? Sanitization story? | block components rendering `content` attrs |
| **Performance** | GraphQL query size grows with block registry; SSR block tree depth | `wp-block-query.ts` |
| **Documentation / DX** | Is `blocks/README.md` enough for customer devs? Onboarding time? | all READMEs |
| **CI / quality gates** | `generate:registry`, `validate:contracts` — are they in CI? | turbo config, package scripts |
| **Licensing** | shadcn (MIT), WP (GPL), WPGraphQL — framework licensing implications? | dependency licenses |

**Verdict criteria:**
- **Framework-ready** — gaps are packaging polish, not architecture blockers.
- **Framework-possible with investment** — core pattern works; needs CLI, docs, test harness, distribution.
- **Not framework-shaped** — optimized for a single internal product; extraction would be a rewrite.

**Compare against:** Faust.js, Frontity (deprecated but lessons), WP Engine Atlas, Strapi + Next templates, Turborepo starter kits, shadcn's own monorepo patterns.

---

## Subagent strategy (required)

Launch **parallel subagents** for independent domains. Suggested split:

| Subagent | Focus | Read-only? |
|----------|-------|------------|
| **A — Parity** | Q1: editor vs frontend rendering paths, `wp-editor.css` vs CVA, visual drift vectors | yes |
| **B — Contracts** | Q2: `block.schema.json` expressiveness, registry codegen, validation scripts | yes |
| **C — Layout & compound** | Q2: `group-layout.ts`, columns, card family, `display: contents` hacks | yes |
| **D — WP bridge** | Q1+Q2: `apps/wp-plugin/src/index.tsx`, `chadpress.php`, control generation gaps | yes |
| **E — Data pipeline** | Q2+Q3: `wp-block-query.ts`, GraphQL fragments, depth limits, `renderedHtml` unused | yes |
| **F — Framework packaging** | Q3: distribution, multi-tenant, DX, testing, CI, licensing | yes |
| **G — Alternatives** | Benchmark against 3–5 established approaches; when Chadpress wins/loses | yes (web search allowed) |

After subagents return, **synthesize** — look for contradictions, shared root causes, and questions that span domains (e.g. "1:1 is impossible" + "layout mapping is fragile" may share a root cause: fighting WP layout model).

---

## Known pain points (validate, don't assume)

These are **hypotheses from prior exploration** — confirm or refute with code evidence:

1. Editor control generation is incomplete vs `block.schema.json` vocabulary
2. GraphQL `innerBlocks` capped at 4 levels — deep trees silently truncate
3. `renderedHtml` is fetched but never used as fallback for unregistered blocks
4. No automated tests or visual regression
5. Contract validation only covers heading + button deeply
6. Core block coverage is thin (heading, paragraph, group, columns/column only)
7. `chadpress-ui/` duplicate tree may drift from `packages/ui/`
8. Card compound block requires CSS/layout hacks (`display: contents`, `data-slot` selectors)
9. Responsive `styleMap` explicitly deferred (YAGNI) — will this block real customer sites?
10. Dynamic `save() → null` blocks won't render in non-headless WP contexts

---

## Investigation methods

1. **Read code** — trace full paths for at least 4 blocks (group, button, card, heading)
2. **Trace attribute lifecycle** — Gutenberg control → serialized block comment → GraphQL field → `applyAttributeDefaults` → component prop → CSS class
3. **Find asymmetries** — anywhere editor and frontend diverge in code path, note it
4. **Count manual steps** — what does adding block #20 require? List every file/touchpoint.
5. **Search for TODOs, hacks, "parity", "bug", "workaround"** in comments
6. **Check schema vs implementation** — `block.schema.json` promises vs `index.tsx` delivers
7. **Web research** — how do Faust, ACF, native block themes, and visual builders solve the same problems?

**Do not** spin up DDEV or run the full stack unless a question truly requires runtime proof. If runtime is needed, state exactly what experiment would settle it.

---

## Deliverable format

```markdown
# Chadpress Declaration Engine — Deep-Dive Report

## Executive summary
(3–5 sentences: overall viability verdict)

## Q1 — 1:1 representation
### Verdict: [possible | partial | not possible | unknown]
### Evidence
### Drift vectors (ranked)
### What "good enough" parity looks like in practice

## Q2 — Architecture soundness
### Verdict: [sound | sound with caveats | structurally flawed]
### Evidence
### Complexity hotspots
### Scaling ceiling (blocks, customers, layout variants)

## Q3 — Framework packaging
### Verdict: [ready | possible with investment | not shaped for it]
### Evidence
### Missing system components (ranked)
### Minimum viable framework surface area

## Cross-cutting findings
(root causes that span multiple questions)

## Risk register
| Risk | Severity | Likelihood | Mitigation category |

## Alternative approaches comparison
(when to use Chadpress vs X)

## Open questions requiring runtime/customer validation

## Conclusion
(honest recommendation: pursue / pivot / scope-down — with reasoning)
```

---

## Constraints for the analyst

- **No implementation plan** unless a finding is existential (e.g. "GPL contamination makes SaaS impossible")
- **No bikeshedding** on style preferences — focus on system viability
- **Cite files** — every major claim should reference a path in this repo
- **Acknowledge what's working** — the project has deliberate, thoughtful choices (shadow declarations, pure React, CVA styleMap); don't only criticize
- **Distinguish** "hard because headless WP is hard" from "hard because this approach is wrong"
- **Be specific about dynamic/complicated blocks** — generic headless advice is not useful; ground analysis in `group-layout.ts`, card compound blocks, and control generation

---

## Quick reference — block inventory (13 in registry)

**Core shadows:** `core/heading`, `core/paragraph`, `core/group`, `core/columns`, `core/column`  
**Custom:** `chadpress/button`, `chadpress/card`, `chadpress/card-header`, `chadpress/card-content`, `chadpress/card-footer`, `chadpress/card-title`, `chadpress/card-description`

**Canonical examples:**
- Simple shadow: `packages/ui/blocks/heading/`
- Layout (hardest): `packages/ui/blocks/group/`
- Custom + controls: `packages/ui/blocks/button/`
- Compound: `packages/ui/blocks/card/`

---

*This prompt was generated for investigative analysis of the Chadpress Declaration Engine. Update it if the architecture materially changes.*
