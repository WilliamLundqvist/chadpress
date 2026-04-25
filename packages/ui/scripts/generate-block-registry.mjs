import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const blocksDir = path.join(root, "blocks")
const outputPath = path.join(blocksDir, "generated-registry.ts")

function toIdentifier(folderName) {
  return `${folderName.replace(/[^a-zA-Z0-9_$]/g, "_")}Definition`
}

function readBlockMeta(folderName) {
  const blockPath = path.join(blocksDir, folderName, "block.json")
  return JSON.parse(fs.readFileSync(blockPath, "utf8"))
}

const folders = fs
  .readdirSync(blocksDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((folderName) => fs.existsSync(path.join(blocksDir, folderName, "block.json")))
  .sort()

const blocks = folders.map((folderName) => ({
  folderName,
  importName: toIdentifier(folderName),
  meta: readBlockMeta(folderName),
}))

const imports = blocks
  .map(
    ({ folderName, importName }) =>
      `import { blockDefinition as ${importName} } from "./${folderName}"`,
  )
  .join("\n")

const entries = blocks
  .map(({ importName, meta }) => `  ${JSON.stringify(meta.name)}: ${importName},`)
  .join("\n")

const source = `${imports}

export const blockRegistry = {
${entries}
} as const

export type BlockName = keyof typeof blockRegistry
`

fs.writeFileSync(outputPath, source)
console.log(`Generated ${path.relative(root, outputPath)} with ${blocks.length} blocks`)
