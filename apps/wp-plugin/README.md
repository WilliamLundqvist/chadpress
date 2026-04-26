# apps/wp-plugin — Chadpress WordPress plugin

Injects **`@repo/ui`** editor styles into the Gutenberg iframe (`add_editor_style` → `chadpress-ui/dist/editor.css`) so core and custom blocks match Next.js typography/tokens.

Also:

- Reads mounted `packages/ui/blocks/*/block.json` and applies `customEditor.disabledSupports` to matching **core** blocks (declaration-driven).
- Registers **`chadpress/*`** blocks that use `customEditor.source: "custom"` and enqueues the built editor script (`build/index.js`).

Full-stack setup is summarized in the [monorepo README](../../README.md).

## DDEV bind mounts (required)

WordPress/DDEV usually lives **next to** the monorepo. Paths below are **relative to `wp/.ddev/`**. They must point at the real `monorepo/apps/wp-plugin` and `monorepo/packages/ui` — not a broken relative path inside `wp/` only.

**Monorepo at `chadpress/monorepo`, WordPress at `chadpress/wp`:**

```yaml
services:
  web:
    volumes:
      - ../../monorepo/apps/wp-plugin:/var/www/html/wp-content/plugins/chadpress-plugin
      - ../../monorepo/packages/ui:/var/www/html/wp-content/plugins/chadpress-plugin/chadpress-ui:cached
```

If the clone lives elsewhere, adjust (`../<clone>/monorepo/...`).

**Symlink vs container:** On the host, `apps/wp-plugin/chadpress-ui` may symlink to `../../packages/ui`. Inside DDEV, the **second volume replaces** that path — the symlink target does not resolve correctly inside the container, so the mount line is mandatory.

If `chadpress-ui` is an empty folder, delete it and restore the symlink or remount. Then `ddev restart`.

## Builds (from monorepo root)

```bash
# Editor iframe CSS → packages/ui/dist/editor.css (visible as chadpress-ui/dist/editor.css in WP)
pnpm --filter @repo/ui build:css

# Gutenberg bundle for chadpress/* blocks → apps/wp-plugin/build/
pnpm --filter wp-plugin build
```

## Core block policy (`customEditor` on shadows)

Example — `packages/ui/blocks/heading/block.json`:

```json
"customEditor": {
  "source": "core",
  "allowedRichText": ["bold", "italic", "link"],
  "disabledSupports": ["color", "backgroundColor", "fontSize"]
}
```

The plugin maps `disabledSupports` to WordPress block supports so the editor does not expose options the frontend contract does not implement.

## Plugins (one-time per environment)

From the WordPress/DDEV directory:

```bash
ddev bootstrap-plugins
```

Or install **WPGraphQL** (wordpress.org) and **WPGraphQL Content Blocks** ([releases](https://github.com/wpengine/wp-graphql-content-blocks/releases)) manually.

## Smoke test

1. `pnpm --filter @repo/ui build:css` (+ `pnpm --filter wp-plugin build` if you use custom blocks)
2. `ddev restart` after mount changes
3. Activate **Chadpress**, **WPGraphQL**, **WPGraphQL Content Blocks**
4. Edit a post with a **Heading** (or your blocks) — preview should use shared styles
5. Optional GraphiQL query for `editorBlocks` / `attributes` — see older docs or WPGraphQL IDE

If `editorBlocks` is missing, Content Blocks is inactive or the block type is unsupported.

## Tailwind CLI issues

`build:css` uses Tailwind v4 CLI from `packages/ui`. If it fails locally, run the same command in an environment where `packages/ui` devDependencies install cleanly; input is `src/globals.css` (imports `src/wp-editor.css`).
