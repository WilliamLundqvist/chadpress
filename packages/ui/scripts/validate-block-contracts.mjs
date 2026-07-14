import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Ajv from "ajv"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const blocksDir = path.join(root, "blocks")
const errors = []

function report(message) {
  errors.push(`[block-contract] ${message}`)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

function parseCapabilities(controlTypes) {
  const declarations = readJson(path.join(blocksDir, "capabilities.json"))
  const capabilities = new Map()

  for (const [name, declaration] of Object.entries(declarations)) {
    const attributes = new Set(Object.keys(declaration.attributes ?? {}))
    const controls = [
      ...(declaration.controls?.toolbar ?? []),
      ...(declaration.controls?.inspector ?? []),
    ]

    for (const control of controls) {
      if (!controlTypes.has(control.type)) {
        report(`capability "${name}" uses control type "${control.type}" that the editor does not implement`)
      }
      if (!attributes.has(control.bind)) {
        report(`capability "${name}" control binds unknown attribute "${control.bind}"`)
      }
    }
    for (const attribute of Object.keys(declaration.classMap ?? {})) {
      if (!attributes.has(attribute)) {
        report(`capability "${name}" classMap.${attribute} does not bind a capability attribute`)
      }
    }

    capabilities.set(name, { attributes, controls })
  }
  return capabilities
}

function sourceFilesForStyleChecks(folderName) {
  const folderPath = path.join(blocksDir, folderName)
  const files = fs
    .readdirSync(folderPath)
    .filter((name) => /\.(?:ts|tsx)$/.test(name))
    .map((name) => path.join(folderPath, name))
  const sharedComponent = path.join(root, "src/components/ui", `${folderName}.tsx`)
  if (fs.existsSync(sharedComponent)) files.push(sharedComponent)
  return files
}

function validateStyleTokens(folderName, styleMap) {
  const candidates = sourceFilesForStyleChecks(folderName)
    .map((filePath) => ({
      filePath,
      source: fs.readFileSync(filePath, "utf8"),
    }))
    .filter(({ source }) => /\bcva\s*\(|VariantTokens|Variants\s*=/.test(source))

  for (const [attribute, mapping] of Object.entries(styleMap)) {
    const tokens = [...new Set(Object.values(mapping))]
    const tokenPattern = (token) =>
      new RegExp(`(?:^|[,{]\\s*)(?:${escapeRegex(token)}|["']${escapeRegex(token)}["'])\\s*:`, "m")
    const relevant = candidates.filter(({ source }) =>
      tokens.some((token) => tokenPattern(token).test(source)),
    )
    if (relevant.length === 0) continue

    for (const token of tokens) {
      if (!relevant.some(({ source }) => tokenPattern(token).test(source))) {
        report(
          `${folderName} styleMap.${attribute} uses token "${token}" not found in the corresponding CVA/style token source`,
        )
      }
    }
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const schema = readJson(path.join(blocksDir, "block.schema.json"))
const ajv = new Ajv({ allErrors: true, strict: false })
const validateSchema = ajv.compile(schema)
const controlTypes = new Set(
  schema.definitions?.customControl?.properties?.type?.enum ?? [],
)
const capabilities = parseCapabilities(controlTypes)
const folders = fs
  .readdirSync(blocksDir, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      fs.existsSync(path.join(blocksDir, entry.name, "block.json")),
  )
  .map((entry) => entry.name)
  .sort()
const blocksByFolder = new Map(
  folders.map((folderName) => [
    folderName,
    readJson(path.join(blocksDir, folderName, "block.json")),
  ]),
)
const blocksByName = new Map(
  [...blocksByFolder.values()].map((block) => [block.name, block]),
)

function effectiveAttributeNames(block) {
  const names = new Set(Object.keys(block.attributes ?? {}))
  for (const capabilityName of block.capabilities ?? []) {
    const capability = capabilities.get(capabilityName)
    if (!capability) continue
    for (const attribute of capability.attributes) names.add(attribute)
  }
  return names
}

function validateExampleChildren(parentBlock, children, examplePath) {
  if (!Array.isArray(children)) return
  const allowedBlocks = new Set(parentBlock.supports?.allowedBlocks ?? [])

  for (const [index, child] of children.entries()) {
    if (!child || typeof child !== "object") continue
    const childPath = `${examplePath}.innerBlocks[${index}]`
    const childBlock = blocksByName.get(child.name)
    if (!childBlock) {
      report(`${childPath} references unknown block "${child.name}"`)
      continue
    }
    if (!parentBlock.supports?.innerBlocks) {
      report(`${examplePath} does not support inner blocks`)
    } else if (!allowedBlocks.has(child.name)) {
      report(`${childPath} uses "${child.name}", which is not allowed by "${parentBlock.name}"`)
    }

    const childAttributes = effectiveAttributeNames(childBlock)
    for (const attribute of Object.keys(child.attributes ?? {})) {
      if (!childAttributes.has(attribute)) {
        report(`${childPath} uses unknown attribute "${attribute}"`)
      }
    }
    validateExampleChildren(childBlock, child.innerBlocks, childPath)
  }
}

for (const folderName of folders) {
  const block = blocksByFolder.get(folderName)
  if (block.name !== `chadpress/${folderName}`) {
    report(`${folderName} block.json name must be "chadpress/${folderName}", got "${block.name}"`)
    continue
  }
  if (!validateSchema(block)) {
    for (const error of validateSchema.errors ?? []) {
      report(`${folderName}${error.instancePath || " block.json"} ${error.message}`)
    }
  }

  const effectiveAttributes = new Set(Object.keys(block.attributes ?? {}))
  const effectiveControls = [
    ...(block.customControls?.toolbar ?? []),
    ...(block.customControls?.inspector ?? []),
  ]

  for (const capabilityName of block.capabilities ?? []) {
    const capability = capabilities.get(capabilityName)
    if (!capability) {
      report(`${folderName} uses unknown capability "${capabilityName}"`)
      continue
    }
    for (const attribute of capability.attributes) effectiveAttributes.add(attribute)
    effectiveControls.push(...capability.controls)
  }

  const styleMap = block.customTailwind?.styleMap ?? {}
  for (const attribute of Object.keys(styleMap)) {
    if (!effectiveAttributes.has(attribute)) {
      report(`${folderName} styleMap.${attribute} does not bind an effective attribute`)
    }
  }
  validateStyleTokens(folderName, styleMap)

  for (const control of effectiveControls) {
    if (!effectiveAttributes.has(control.bind)) {
      report(`${folderName} ${control.type} control binds unknown attribute "${control.bind}"`)
    }
    if (!controlTypes.has(control.type)) {
      report(`${folderName} uses control type "${control.type}" that the editor does not implement`)
    }
  }

  if (!block.example || typeof block.example.attributes !== "object") {
    report(`${folderName} must provide example.attributes`)
  } else {
    for (const attribute of Object.keys(block.example.attributes)) {
      if (!effectiveAttributes.has(attribute)) {
        report(`${folderName} example uses unknown attribute "${attribute}"`)
      }
    }
    validateExampleChildren(block, block.example.innerBlocks, `${folderName} example`)
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"))
  console.error(`\nBlock contract validation failed with ${errors.length} error(s)`)
  process.exit(1)
}

console.log(`Block contract validation passed for ${folders.length} blocks`)
