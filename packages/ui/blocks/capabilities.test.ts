import { describe, expect, it } from "vitest"

import capabilitiesJson from "./capabilities.json"
import {
  capabilityDefinitions,
  expandBlockCapabilities,
  getCapabilityClassName,
  normalizeCapabilities,
  type CapabilityAwareMeta,
} from "./capabilities"

const alignmentToolbarControl = {
  type: "alignment",
  bind: "align",
  label: "Alignment",
}

describe("expandBlockCapabilities", () => {
  it("adds the align attribute and prepends the alignment toolbar control", () => {
    const meta: CapabilityAwareMeta = {
      attributes: { content: { type: "string", default: "" } },
      capabilities: ["align"],
      customControls: {
        toolbar: [{ type: "text", bind: "content", label: "Content" }],
      },
    }

    const expanded = expandBlockCapabilities(meta)

    expect(expanded.attributes.align).toEqual({
      type: "string",
      default: "left",
    })
    expect(expanded.attributes.content).toEqual({ type: "string", default: "" })
    expect(expanded.customControls.toolbar).toEqual([
      alignmentToolbarControl,
      { type: "text", bind: "content", label: "Content" },
    ])
  })

  it("lets an explicit block attribute override the capability default", () => {
    const meta: CapabilityAwareMeta = {
      attributes: { align: { type: "string", default: "center" } },
      capabilities: ["align"],
    }

    const expanded = expandBlockCapabilities(meta)

    expect(expanded.attributes.align).toEqual({
      type: "string",
      default: "center",
    })
  })

  it("ignores unknown capability names", () => {
    const meta: CapabilityAwareMeta = {
      attributes: {},
      capabilities: ["gravity", "align", "telepathy"],
    }

    const expanded = expandBlockCapabilities(meta)

    expect(Object.keys(expanded.attributes)).toEqual(["align"])
    expect(expanded.customControls.toolbar).toEqual([alignmentToolbarControl])
    expect(expanded.customControls.inspector).toEqual([])
  })

  it("applies duplicate capability names only once", () => {
    const meta: CapabilityAwareMeta = {
      attributes: {},
      capabilities: ["align", "align"],
    }

    const expanded = expandBlockCapabilities(meta)

    expect(expanded.customControls.toolbar).toEqual([alignmentToolbarControl])
    expect(Object.keys(expanded.attributes)).toEqual(["align"])
  })

  it("does not mutate the input meta object", () => {
    const meta: CapabilityAwareMeta = {
      attributes: { content: { type: "string", default: "" } },
      capabilities: ["align"],
      customControls: {
        toolbar: [{ type: "text", bind: "content", label: "Content" }],
      },
    }
    const snapshot = structuredClone(meta)

    const expanded = expandBlockCapabilities(meta)
    // Mutating the result must not leak back into the input either.
    expanded.attributes.align!.default = "right"
    expanded.attributes.content!.default = "changed"
    expanded.customControls.toolbar[0]!.label = "changed"
    expanded.customControls.toolbar.pop()

    expect(meta).toEqual(snapshot)
  })
})

describe("getCapabilityClassName", () => {
  it("maps an explicit align value to its class", () => {
    expect(
      getCapabilityClassName({ capabilities: ["align"] }, { align: "center" }),
    ).toBe("text-center")
  })

  it("falls back to the attribute default when the attribute is missing", () => {
    expect(getCapabilityClassName({ capabilities: ["align"] }, {})).toBe(
      "text-left",
    )
    expect(getCapabilityClassName({ capabilities: ["align"] }, null)).toBe(
      "text-left",
    )
  })

  it("returns an empty string for unknown values", () => {
    expect(
      getCapabilityClassName({ capabilities: ["align"] }, { align: "diagonal" }),
    ).toBe("")
  })

  it("returns an empty string for metas without capabilities", () => {
    expect(getCapabilityClassName({}, { align: "center" })).toBe("")
    expect(
      getCapabilityClassName({ capabilities: [] }, { align: "center" }),
    ).toBe("")
  })

  it("maps spacing values, treating padding none as no class", () => {
    expect(
      getCapabilityClassName({ capabilities: ["spacing"] }, { padding: "md" }),
    ).toBe("p-4")
    expect(
      getCapabilityClassName({ capabilities: ["spacing"] }, { padding: "none" }),
    ).toBe("")
  })

  it("joins classes from multiple capabilities", () => {
    expect(
      getCapabilityClassName(
        { capabilities: ["align", "spacing"] },
        { align: "right", padding: "sm" },
      ),
    ).toBe("text-right p-2")
  })
})

describe("normalizeCapabilities", () => {
  it("dedupes and filters unknown names while preserving order", () => {
    expect(
      normalizeCapabilities(["spacing", "align", "spacing", "bogus", "align"]),
    ).toEqual(["spacing", "align"])
  })

  it("returns an empty array for null and undefined input", () => {
    expect(normalizeCapabilities(null)).toEqual([])
    expect(normalizeCapabilities(undefined)).toEqual([])
  })
})

describe("capabilityDefinitions", () => {
  it("is derived from capabilities.json", () => {
    expect(Object.keys(capabilityDefinitions).sort()).toEqual(
      Object.keys(capabilitiesJson).sort(),
    )
  })
})
