/**
 * Generates the WordPress benchmark page from the block example fixtures.
 *
 * The page is the WordPress twin of the `/dev/blocks` gallery: every block's
 * `example.attributes` (+ `example.innerBlocks`) serialized as Gutenberg block
 * markup. Run with `--apply` to upsert the page in the DDEV WordPress site via
 * WP-CLI; without it the markup is printed to stdout.
 *
 * Usage, from packages/ui:
 *   node scripts/generate-benchmark.mjs           # print markup
 *   node scripts/generate-benchmark.mjs --apply   # upsert the WP page
 *   CHADPRESS_WP_DIR=/path/to/wp node scripts/generate-benchmark.mjs --apply
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const blocksDir = path.join(root, "blocks")
const wpDir = process.env.CHADPRESS_WP_DIR ?? path.resolve(root, "../../../wp")

const PAGE_SLUG = "chadpress-benchmark"
const PAGE_TITLE = "Chadpress Block Engine Benchmark"

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"))
}

/** Mirrors @wordpress/blocks serializeAttributes escaping for comment safety. */
function serializeAttributes(attributes) {
  return JSON.stringify(attributes)
    .replace(/--/g, "\\u002d\\u002d")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\\"/g, "\\u0022")
}

function serializeBlock({ name, attributes = {}, innerBlocks = [] }) {
  const attrJson = Object.keys(attributes).length
    ? ` ${serializeAttributes(attributes)}`
    : ""

  if (!innerBlocks.length) {
    return `<!-- wp:${name}${attrJson} /-->`
  }

  const children = innerBlocks.map((child) => serializeBlock(child)).join("\n")
  return `<!-- wp:${name}${attrJson} -->\n${children}\n<!-- /wp:${name} -->`
}

function buildPageMarkup() {
  const folders = fs
    .readdirSync(blocksDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(blocksDir, entry.name, "block.json")),
    )
    .map((entry) => entry.name)
    .sort()

  const sections = [
    serializeBlock({
      name: "chadpress/heading",
      attributes: { content: PAGE_TITLE, level: 1, align: "left" },
    }),
    serializeBlock({
      name: "chadpress/text",
      attributes: {
        content:
          "Generated from example fixtures by scripts/generate-benchmark.mjs — do not edit in the WordPress editor; changes belong in each block.json example.",
        align: "left",
      },
    }),
  ]

  for (const folderName of folders) {
    const block = readJson(path.join(blocksDir, folderName, "block.json"))
    if (!block.example) continue

    sections.push(
      serializeBlock({
        name: "chadpress/heading",
        attributes: {
          content: `${block.title} — ${block.name}`,
          level: 2,
          align: "left",
        },
      }),
      serializeBlock({
        name: block.name,
        attributes: block.example.attributes ?? {},
        innerBlocks: block.example.innerBlocks ?? [],
      }),
    )
  }

  return sections.join("\n\n")
}

function wpCli(args) {
  return execFileSync("ddev", ["wp", ...args], {
    cwd: wpDir,
    encoding: "utf8",
  }).trim()
}

function applyToWordPress(markup) {
  const existingId = wpCli([
    "post",
    "list",
    "--post_type=page",
    `--name=${PAGE_SLUG}`,
    "--field=ID",
  ])

  if (existingId) {
    wpCli([
      "post",
      "update",
      existingId,
      `--post_title=${PAGE_TITLE}`,
      `--post_content=${markup}`,
      "--post_status=publish",
    ])
    return existingId
  }

  return wpCli([
    "post",
    "create",
    "--post_type=page",
    `--post_title=${PAGE_TITLE}`,
    `--post_name=${PAGE_SLUG}`,
    `--post_content=${markup}`,
    "--post_status=publish",
    "--porcelain",
  ])
}

const markup = buildPageMarkup()

if (process.argv.includes("--apply")) {
  if (!fs.existsSync(wpDir)) {
    console.error(
      `WordPress project not found at ${wpDir}. Set CHADPRESS_WP_DIR to the DDEV project root.`,
    )
    process.exit(1)
  }
  const pageId = applyToWordPress(markup)
  console.log(`Benchmark page synced: id=${pageId} slug=${PAGE_SLUG}`)
} else {
  console.log(markup)
}
