# Chadpress WordPress plugin (Phase 3)

Injects [`@repo/ui`](../../packages/ui) **editor CSS** into the Gutenberg iframe so `core/heading` (and future core blocks) preview with the same typography scale as the Next.js frontend.

It also reads each mounted `packages/ui/blocks/*/block.json` and applies `customEditor.disabledSupports` to matching WordPress core blocks. This keeps Gutenberg from exposing settings the frontend contract does not render yet.

## DDEV mounts

WordPress/DDEV is **not** in this repository. In your local WordPress project, add bind mounts under `web` in `.ddev/docker-compose.mounts.yaml`. Paths below are relative to `wp/.ddev/` when this monorepo clone is a **sibling** folder named `chadpress`:

```yaml
services:
  web:
    volumes:
      - ../chadpress/apps/wp-plugin:/var/www/html/wp-content/plugins/chadpress-plugin
      - ../chadpress/packages/ui:/var/www/html/wp-content/plugins/chadpress-plugin/chadpress-ui:cached
```

Rename `chadpress` if your clone directory differs.

In the monorepo, `apps/wp-plugin/chadpress-ui` is a **symlink** to `../../packages/ui`. That way your editor shows blocks, `dist/`, and source — not an empty directory. (DDEV’s bind mount targets the same `packages/ui` path inside the container; the symlink is for host-side clarity and matches what PHP reads when paths resolve on disk.)

If you see an **empty** `chadpress-ui` on disk, something likely created a real empty folder; remove it and restore the symlink, or re-clone. Do not expect a second copy of the UI inside the plugin tree.

After changing mounts, run `ddev restart` from the WordPress project directory.

## Build CSS (required before editor styles work)

From the monorepo root:

```bash
pnpm --filter @repo/ui build:css
```

This writes `packages/ui/dist/editor.css`, which is visible inside the container as `chadpress-ui/dist/editor.css`.

## Build custom block editor JS

Custom `chadpress/*` blocks are registered from the mounted `packages/ui/blocks/*/block.json` declarations. Build the Gutenberg editor adapter from the monorepo root:

```bash
pnpm --filter wp-plugin build
```

This writes `apps/wp-plugin/build/index.js` and `index.asset.php`. The PHP plugin attaches that bundle to every declaration with `customEditor.source: "custom"`.

## Core block support policy

Example from `packages/ui/blocks/heading/block.json`:

```json
"customEditor": {
  "source": "core",
  "allowedRichText": ["bold", "italic", "link"],
  "disabledSupports": ["color", "backgroundColor", "fontSize"]
}
```

The plugin maps those disabled supports to WordPress block supports:

- `color` → text/link color controls off
- `backgroundColor` → background/gradient controls off
- `fontSize` → typography font-size control off

This is intentionally declaration-driven. If the editor allows a setting, the matching `block.json`, GraphQL query generation, and React component must support it.

## Install third-party GraphQL plugins (one-time per environment)

From the WordPress / DDEV project (e.g. `chadpress/wp`):

```bash
ddev bootstrap-plugins
```

Or by hand: install **WPGraphQL** from WordPress.org; install **WPGraphQL Content Blocks** from [wpengine/wp-graphql-content-blocks releases](https://github.com/wpengine/wp-graphql-content-blocks/releases).

## Manual smoke test (Phase 3)

1. `pnpm --filter @repo/ui build:css`
2. `ddev restart` (if you changed mounts)
3. `ddev bootstrap-plugins` (or install plugins manually)
4. In wp-admin, activate **Chadpress** and ensure **WPGraphQL** and **WPGraphQL Content Blocks** are active
5. Create a post, add a **core Heading** block, set level and alignment — preview should use Chadpress typography
6. Open the GraphiQL / WPGraphQL IDE and run (adjust the query if your field names differ slightly):

   ```graphql
   query {
     posts(first: 1) {
       nodes {
         editorBlocks {
           name
           ... on CoreHeading {
             attributes {
               content
               level
               textAlign
             }
           }
         }
       }
     }
   }
   ```

7. Confirm `content`, `level`, and `textAlign` match the block in the editor

If `editorBlocks` is missing, ensure **WPGraphQL Content Blocks** is active and the post is saved with a block that plugin supports.

## Build fallback

If `tailwindcss` CLI fails, run the same `build:css` from a machine with `@tailwindcss/cli@^4` installed in `packages/ui` — the input is `src/globals.css` (which imports `src/wp-editor.css`).
