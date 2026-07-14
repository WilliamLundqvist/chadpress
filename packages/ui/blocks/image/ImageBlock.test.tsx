import { describe, expect, it } from "vitest"

import { getImageObjectFitVariant } from "./ImageBlock"

describe("getImageObjectFitVariant", () => {
  it("maps contract values to CVA tokens", () => {
    expect(getImageObjectFitVariant("cover")).toBe("cover")
    expect(getImageObjectFitVariant("contain")).toBe("contain")
    expect(getImageObjectFitVariant("fill")).toBe("fill")
  })

  it("falls back to cover for unknown values", () => {
    expect(getImageObjectFitVariant("unknown")).toBe("cover")
  })
})
