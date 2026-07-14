import capabilitiesData from "./capabilities.json"

export type ControlType =
  | "select"
  | "toggle"
  | "text"
  | "alignment"
  | "headingLevel"
  | "link"

export type BlockAttributeSpec = {
  type: string
  default?: unknown
  richText?: boolean
  tagName?: string
  placeholder?: string
}

export type BlockControl = {
  type: ControlType
  bind: string
  label: string
  options?: readonly (string | number | boolean)[]
}

export type CapabilityAwareMeta = {
  attributes: Record<string, BlockAttributeSpec>
  capabilities?: readonly string[]
  customControls?: {
    toolbar?: readonly BlockControl[]
    inspector?: readonly BlockControl[]
  }
}

export type CapabilityDeclaration = {
  attributes: Record<string, BlockAttributeSpec>
  controls: {
    toolbar?: readonly BlockControl[]
    inspector?: readonly BlockControl[]
  }
  classMap: Record<string, Record<string, string>>
}

type CapabilityDefinition = CapabilityDeclaration & {
  getClassName: (attributes: Record<string, unknown>) => string
}

export type CapabilityName = keyof typeof capabilitiesData

/**
 * `capabilities.json` is the single capability declaration shared by this
 * module, the contract validator, and the WordPress plugin (PHP reads the same
 * file to expand registered block attributes).
 */
const capabilityDeclarations = capabilitiesData as Record<
  CapabilityName,
  CapabilityDeclaration
>

function createClassNameGetter(declaration: CapabilityDeclaration) {
  return (attributes: Record<string, unknown>): string =>
    Object.entries(declaration.classMap)
      .map(([attributeName, classesByValue]) => {
        const fallback = declaration.attributes[attributeName]?.default
        const value = String(attributes[attributeName] ?? fallback ?? "")
        return classesByValue[value] ?? ""
      })
      .filter(Boolean)
      .join(" ")
}

export const capabilityDefinitions = Object.fromEntries(
  Object.entries(capabilityDeclarations).map(([name, declaration]) => [
    name,
    { ...declaration, getClassName: createClassNameGetter(declaration) },
  ]),
) as Record<CapabilityName, CapabilityDefinition>

function isCapabilityName(value: string): value is CapabilityName {
  return Object.prototype.hasOwnProperty.call(capabilityDefinitions, value)
}

/** Returns known capability names once each, preserving declaration order. */
export function normalizeCapabilities(
  capabilities: readonly string[] | null | undefined,
): CapabilityName[] {
  const normalized: CapabilityName[] = []
  const seen = new Set<CapabilityName>()

  for (const capability of capabilities ?? []) {
    if (isCapabilityName(capability) && !seen.has(capability)) {
      normalized.push(capability)
      seen.add(capability)
    }
  }

  return normalized
}

/**
 * Produces effective block metadata without changing the imported block.json
 * object. Explicit block attributes are authoritative over capability defaults.
 */
export function expandBlockCapabilities<M extends CapabilityAwareMeta>(
  meta: M,
): Omit<M, "attributes" | "customControls"> & {
  attributes: Record<string, BlockAttributeSpec>
  customControls: {
    toolbar: BlockControl[]
    inspector: BlockControl[]
  }
} {
  const capabilities = normalizeCapabilities(meta.capabilities)
  const capabilityAttributes: Record<string, BlockAttributeSpec> = {}
  const toolbar: BlockControl[] = []
  const inspector: BlockControl[] = []

  for (const capability of capabilities) {
    const definition = capabilityDefinitions[capability]
    for (const [name, attribute] of Object.entries(definition.attributes)) {
      capabilityAttributes[name] = { ...attribute }
    }
    toolbar.push(
      ...(definition.controls.toolbar ?? []).map((control) => ({ ...control })),
    )
    inspector.push(
      ...(definition.controls.inspector ?? []).map((control) => ({ ...control })),
    )
  }

  return {
    ...meta,
    attributes: {
      ...capabilityAttributes,
      ...Object.fromEntries(
        Object.entries(meta.attributes).map(([name, attribute]) => [
          name,
          { ...attribute },
        ]),
      ),
    },
    customControls: {
      toolbar: [
        ...toolbar,
        ...(meta.customControls?.toolbar ?? []).map((control) => ({
          ...control,
        })),
      ],
      inspector: [
        ...inspector,
        ...(meta.customControls?.inspector ?? []).map((control) => ({
          ...control,
        })),
      ],
    },
  }
}

/** Alias describing the normalization step used by both runtimes. */
export const normalizeBlockMeta = expandBlockCapabilities

export function getCapabilityClassName(
  meta: Pick<CapabilityAwareMeta, "capabilities">,
  attributes: Record<string, unknown> | null | undefined,
): string {
  const effectiveAttributes = attributes ?? {}

  return normalizeCapabilities(meta.capabilities)
    .map((capability) =>
      capabilityDefinitions[capability].getClassName(effectiveAttributes),
    )
    .filter(Boolean)
    .join(" ")
}
