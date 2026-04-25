import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"))
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8")
}

function fail(message) {
  throw new Error(`[block-contract] ${message}`)
}

const allowedDisabledSupports = new Set([
  "color",
  "backgroundColor",
  "fontSize",
  "__experimentalFontWeight",
  "__experimentalFontStyle",
  "__experimentalTextTransform",
  "__experimentalTextDecoration",
  "__experimentalLetterSpacing",
])

function validateStyleMapAttributes(blockName, block) {
  const attributeNames = new Set(Object.keys(block.attributes ?? {}))
  const styleMap = block.customTailwind?.styleMap ?? {}

  for (const name of Object.keys(styleMap)) {
    if (!attributeNames.has(name)) {
      fail(`${blockName} styleMap.${name} does not map to an attribute in block.json`)
    }
  }

  return styleMap
}

function validateDisabledSupports(blockName, block) {
  for (const support of block.customEditor?.disabledSupports ?? []) {
    if (!allowedDisabledSupports.has(support)) {
      fail(`${blockName} customEditor.disabledSupports contains unsupported value "${support}"`)
    }
  }
}

function extractObjectKeys(source, objectPath) {
  const parts = objectPath.split(".")
  let searchStart = 0
  for (const [partIndex, part] of parts.entries()) {
    const variableMatch =
      partIndex === 0
        ? new RegExp(`(?:const|let|var)\\s+${part}\\s*=\\s*{`, "m").exec(source.slice(searchStart))
        : null
    const index = variableMatch
      ? searchStart + variableMatch.index + variableMatch[0].lastIndexOf("{")
      : source.indexOf(`${part}:`, searchStart)
    if (index === -1) {
      fail(`Could not find object segment "${part}" in ${objectPath}`)
    }
    searchStart = variableMatch ? index : source.indexOf("{", index)
    if (searchStart === -1) {
      fail(`Could not find object body for "${part}" in ${objectPath}`)
    }
  }

  let depth = 0
  let end = searchStart
  for (; end < source.length; end += 1) {
    const char = source[end]
    if (char === "{") depth += 1
    if (char === "}") {
      depth -= 1
      if (depth === 0) break
    }
  }

  const body = source.slice(searchStart + 1, end)
  return new Set([...body.matchAll(/^\s*([A-Za-z0-9_-]+)\s*:/gm)].map((m) => m[1]))
}

function validateHeading() {
  const block = readJson("blocks/heading/block.json")
  const variantsSource = readText("blocks/heading/heading-variants.ts")

  const styleMap = validateStyleMapAttributes("heading", block)

  const variantKeys = extractObjectKeys(variantsSource, "headingVariantTokens.variant")
  const alignKeys = extractObjectKeys(variantsSource, "headingVariantTokens.align")

  for (const [level, token] of Object.entries(styleMap.level ?? {})) {
    if (!variantKeys.has(token)) {
      fail(`heading styleMap.level.${level} -> "${token}" has no matching headingVariantTokens.variant key`)
    }
  }

  for (const [align, token] of Object.entries(styleMap.textAlign ?? {})) {
    if (!alignKeys.has(token)) {
      fail(`heading styleMap.textAlign.${align} -> "${token}" has no matching headingVariantTokens.align key`)
    }
  }

  validateDisabledSupports("heading", block)

  const allowedRichText = new Set(["bold", "italic", "link"])
  for (const format of block.customEditor?.allowedRichText ?? []) {
    if (!allowedRichText.has(format)) {
      fail(`heading customEditor.allowedRichText contains unsupported value "${format}"`)
    }
  }
}

function validateButton() {
  const block = readJson("blocks/button/block.json")
  const buttonSource = readText("src/components/ui/button.tsx")

  const styleMap = validateStyleMapAttributes("button", block)
  const variantKeys = extractObjectKeys(buttonSource, "variants.variant")
  const sizeKeys = extractObjectKeys(buttonSource, "variants.size")

  for (const [variant, token] of Object.entries(styleMap.variant ?? {})) {
    if (!variantKeys.has(token)) {
      fail(`button styleMap.variant.${variant} -> "${token}" has no matching button variant`)
    }
  }

  for (const [size, token] of Object.entries(styleMap.size ?? {})) {
    if (!sizeKeys.has(token)) {
      fail(`button styleMap.size.${size} -> "${token}" has no matching button size`)
    }
  }

  validateDisabledSupports("button", block)
}

validateHeading()
validateButton()
console.log("Block contract validation passed")
