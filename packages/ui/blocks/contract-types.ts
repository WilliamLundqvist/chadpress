export type Values<T> = T[keyof T]

/**
 * Compile-time assertion helper. If `Actual` is not assignable to `Expected`,
 * `tsc --noEmit` fails. This keeps `block.json` and CVA tokens in sync without
 * adding runtime code.
 */
export type AssertAssignable<Actual extends Expected, Expected> = Actual
