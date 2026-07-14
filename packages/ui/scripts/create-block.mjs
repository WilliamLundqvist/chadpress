import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const blocksDir = path.join(root, "blocks")

function usage(message) {
  if (message) console.error(`Error: ${message}\n`)
  console.error(
    "Usage: pnpm --filter @repo/ui create:block <slug> <title> [--description <text>] [--category <name>] [--icon <name>]",
  )
  process.exit(1)
}

function parseArguments(argv) {
  const positional = []
  const options = {
    category: "chadpress",
    description: "",
    icon: "block-default",
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (!argument.startsWith("--")) {
      positional.push(argument)
      continue
    }

    const name = argument.slice(2)
    if (!Object.hasOwn(options, name)) usage(`Unknown option "${argument}"`)
    const value = argv[index + 1]
    if (!value || value.startsWith("--")) usage(`Option "${argument}" requires a value`)
    options[name] = value
    index += 1
  }

  const [slug, title, ...extra] = positional
  if (!slug || !title || extra.length > 0) usage("A slug and title are required")
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug)) {
    usage('Slug must be lowercase kebab-case (for example, "callout-card")')
  }
  if (!title.trim()) usage("Title must not be empty")

  return { slug, title: title.trim(), ...options }
}

function toPascalCase(slug) {
  return slug
    .split("-")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("")
}

const config = parseArguments(process.argv.slice(2))
const componentName = `${toPascalCase(config.slug)}Block`
const folderPath = path.join(blocksDir, config.slug)

if (fs.existsSync(folderPath)) {
  usage(`Refusing to overwrite existing path ${path.relative(root, folderPath)}`)
}

const meta = {
  $schema: "../block.schema.json",
  apiVersion: 3,
  name: `chadpress/${config.slug}`,
  title: config.title,
  category: config.category,
  icon: config.icon,
  description: config.description,
  textdomain: "chadpress",
  attributes: {},
  supports: {
    innerBlocks: false,
    allowedBlocks: [],
    template: [],
    html: false,
  },
  customTailwind: {
    styleMap: {},
    className: "",
  },
  customControls: {
    toolbar: [],
    inspector: [],
  },
  capabilities: [],
  customEditor: {
    source: "custom",
    allowedRichText: [],
  },
  example: {
    attributes: {},
  },
  variations: [],
}

const files = new Map([
  ["block.json", `${JSON.stringify(meta, null, 2)}\n`],
  [
    "types.ts",
    `import blockMeta from "./block.json"\nimport type { InferAttributes } from "../types"\n\nexport type ${componentName.replace(/Block$/, "Attributes")} = InferAttributes<typeof blockMeta>\n`,
  ],
  [
    `${componentName}.tsx`,
    `import type { ${componentName.replace(/Block$/, "Attributes")} } from "./types"\n\nexport function ${componentName}({\n  className,\n}: ${componentName.replace(/Block$/, "Attributes")} & { className?: string }) {\n  return <div className={className} />\n}\n`,
  ],
  [
    "index.ts",
    `import type { BlockDefinition } from "../types"\nimport { ${componentName} } from "./${componentName}"\nimport blockMeta from "./block.json"\nimport type { ${componentName.replace(/Block$/, "Attributes")} } from "./types"\n\nexport type { ${componentName.replace(/Block$/, "Attributes")} } from "./types"\nexport { ${componentName} } from "./${componentName}"\nexport { default as ${config.slug.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase())}Meta } from "./block.json"\n\nexport const blockDefinition: BlockDefinition<typeof blockMeta, ${componentName.replace(/Block$/, "Attributes")}> = {\n  Component: ${componentName},\n  meta: blockMeta,\n}\n`,
  ],
])

let createdFolder = false
try {
  fs.mkdirSync(folderPath)
  createdFolder = true
  for (const [relativePath, source] of files) {
    fs.writeFileSync(path.join(folderPath, relativePath), source, { flag: "wx" })
  }
} catch (error) {
  if (createdFolder) fs.rmSync(folderPath, { recursive: true, force: true })
  throw error
}

const generation = spawnSync(process.execPath, [path.join(root, "scripts/generate-block-registry.mjs")], {
  cwd: root,
  stdio: "inherit",
})

if (generation.status !== 0) {
  console.error(
    `Block files were created, but registry generation failed. Run "pnpm --filter @repo/ui generate:registry" after resolving the error.`,
  )
  process.exit(generation.status ?? 1)
}

console.log(`Created ${path.relative(root, folderPath)}`)
