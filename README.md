# Chadpress monorepo

Headless **WordPress** (content + Gutenberg) with a **Next.js** renderer and a shared **@repo/ui** package (shadcn + Tailwind). Block contracts live in `packages/ui/blocks/*/block.json`; WordPress stores content; WPGraphQL exposes `editorBlocks`; Next maps `block.name` to React components.

## Architecture (high level)

```text
WordPress (DDEV)                    Next.js (apps/web)
┌─────────────────────┐             ┌─────────────────────┐
│ Gutenberg + posts   │  WPGraphQL  │ App Router          │
│ chadpress-plugin    │ ──────────► │ WpContentPage       │
│   → editor.css      │  editorBlocks   → BlockRenderer   │
│   → custom blocks   │             │   → blockRegistry   │
└─────────────────────┘             └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │ packages/ui         │
                                    │ blocks + shadcn     │
                                    └─────────────────────┘
```

- **Single source of truth:** each block’s `block.json` (attributes, supports, `customTailwind`, `customControls`, optional `customEditor`).
- **WordPress** is not committed here as a full site: keep DDEV/WP beside this repo and bind-mount the plugin + UI package (see [apps/wp-plugin/README.md](apps/wp-plugin/README.md)).
- **Docs:** block authoring → [packages/ui/blocks/README.md](packages/ui/blocks/README.md); web app → [apps/web/README.md](apps/web/README.md); plugin + mounts → [apps/wp-plugin/README.md](apps/wp-plugin/README.md).

## Requirements

- Node.js 20+
- [Corepack](https://nodejs.org/api/corepack.html) enabled (`corepack enable`) so the repo’s pinned `pnpm` is used

## Install (monorepo)

```bash
cd monorepo   # repository root if your clone uses monorepo/ as the workspace root
corepack enable
pnpm install
```

Optional: `pnpm run setup` runs `pnpm install`.

## First-time checklist (full stack)

1. **Monorepo:** `pnpm install`
2. **Editor CSS** (Gutenberg iframe): `pnpm --filter @repo/ui build:css`
3. **Custom block editor bundle:** `pnpm --filter wp-plugin build`
4. **WordPress:** DDEV project with mounts to `apps/wp-plugin` and `packages/ui` — [apps/wp-plugin/README.md](apps/wp-plugin/README.md)
5. **Plugins:** WPGraphQL + WPGraphQL Content Blocks active (`ddev bootstrap-plugins` or manual)
6. **Next.js:** in `apps/web`, copy [.env.local.example](apps/web/.env.local.example) to `.env.local` and set `WORDPRESS_GRAPHQL_URL` if needed. The URL must be reachable from **Node** (server-side `fetch`), not only from the browser — see [apps/web/README.md](apps/web/README.md).

## Common commands

| Command | Purpose |
|--------|---------|
| `pnpm dev` | Dev for all apps (Turborepo) |
| `pnpm build` | Production build |
| `pnpm lint` | Lint |
| `pnpm --filter web dev` | Next.js only |
| `pnpm --filter @repo/ui build:css` | Rebuild `packages/ui/dist/editor.css` after changing Tailwind/CSS |
| `pnpm --filter wp-plugin build` | Rebuild Gutenberg editor script for `chadpress/*` blocks |

## Repo layout

```text
monorepo/
  apps/
    web/          # Next.js renderer
    wp-plugin/    # PHP plugin + editor TS bundle (symlink chadpress-ui → packages/ui)
  packages/
    ui/           # shadcn, Tailwind, blocks, blockRegistry
```

## Typical filesystem layout (WordPress next to monorepo)

```text
your-projects/
  chadpress/
    monorepo/     ← this workspace (apps/, packages/)
    wp/           ← DDEV + WordPress (not necessarily in git)
```

Example volume lines in `wp/.ddev/docker-compose.mounts.yaml` (paths relative to `wp/.ddev/`):

```yaml
services:
  web:
    volumes:
      - ../../monorepo/apps/wp-plugin:/var/www/html/wp-content/plugins/chadpress-plugin
      - ../../monorepo/packages/ui:/var/www/html/wp-content/plugins/chadpress-plugin/chadpress-ui:cached
```

Adjust if your clone lives elsewhere (`../chadpress/monorepo/...`). After edits, `ddev restart`.

## Cursor / AI

See [.cursorrules](.cursorrules) for project conventions. Before changing blocks, read [packages/ui/blocks/README.md](packages/ui/blocks/README.md).
