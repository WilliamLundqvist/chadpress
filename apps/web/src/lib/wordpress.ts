/**
 * Native fetch client for WPGraphQL (no Apollo/urql in the prototype).
 */

const DDEV_DEFAULT_HTTPS = "https://chadpress.ddev.site/graphql"
const DDEV_DEFAULT_HTTP = "http://chadpress.ddev.site/graphql"

export function getWordPressGraphQLEndpoint(): string {
  const fromEnv = process.env.WORDPRESS_GRAPHQL_URL
  if (fromEnv) {
    return fromEnv
  }
  return DDEV_DEFAULT_HTTPS
}

export function getWordPressGraphQLEndpointCandidates(): string[] {
  const primary = getWordPressGraphQLEndpoint()
  if (process.env.WORDPRESS_GRAPHQL_URL) {
    return [primary]
  }
  if (process.env.NODE_ENV === "development") {
    if (primary === DDEV_DEFAULT_HTTPS) {
      return [DDEV_DEFAULT_HTTPS, DDEV_DEFAULT_HTTP]
    }
    return [primary, DDEV_DEFAULT_HTTPS, DDEV_DEFAULT_HTTP]
  }
  return [primary]
}

type GraphqlResponse<T> = {
  data?: T
  errors?: { message: string }[]
}

export type WordPressGraphqlAttempt = {
  url: string
  /** Short summary for this URL (HTTP status, GraphQL errors, or thrown message). */
  summary: string
  /** Deeper cause when Node/undici reports `fetch failed` (DNS, TLS, refused, etc.). */
  causeChain?: string
}

function errnoCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code?: unknown }).code
    return typeof c === "string" ? c : undefined
  }
  return undefined
}

/** Walk `Error.cause` (Node 18+) for diagnostics. */
function formatErrorCauseChain(err: unknown, maxDepth = 6): string | undefined {
  const parts: string[] = []
  let cur: unknown = err
  let depth = 0
  while (cur && depth < maxDepth) {
    if (cur instanceof Error) {
      const code = errnoCode(cur)
      const bit =
        code && !cur.message.includes(code)
          ? `${cur.message} (${code})`
          : cur.message
      parts.push(bit)
      cur = cur.cause
    } else {
      break
    }
    depth += 1
  }
  const out = parts.filter(Boolean).join(" → ")
  return out || undefined
}

function hintForFetchFailure(attempts: WordPressGraphqlAttempt[]): string | undefined {
  const blob = attempts
    .map((a) => `${a.summary} ${a.causeChain ?? ""}`)
    .join(" ")
    .toUpperCase()

  if (
    blob.includes("ENOTFOUND") ||
    blob.includes("GETADDRINFO") ||
    blob.includes("EAI_AGAIN")
  )
    return "DNS lookup failed. The hostname in WORDPRESS_GRAPHQL_URL may not resolve from where Next.js runs (e.g. server-side fetch in Docker/WSL). Try the host’s IP, host.docker.internal, or the HTTP port DDEV binds on 127.0.0.1 (see `ddev describe`)."

  if (blob.includes("ECONNREFUSED") || blob.includes("ECONNRESET"))
    return "Connection refused or reset. Is WordPress/DDEV running and listening on that host:port? Server-side fetches use this machine’s network, not the browser’s."

  if (
    blob.includes("CERT") ||
    blob.includes("CERTIFICATE") ||
    blob.includes("UNABLE_TO_VERIFY") ||
    blob.includes("SELF_SIGNED") ||
    blob.includes("SSL") ||
    blob.includes("TLS")
  )
    return "TLS/certificate error. Try http:// for local DDEV, or fix HTTPS trust for Node (e.g. NODE_EXTRA_CA_CERTS), or use a URL Node can verify."

  if (blob.includes("FETCH FAILED") && !attempts.some((a) => a.causeChain))
    return "Node only reported “fetch failed” with no nested cause. Check firewall/VPN, IPv6 vs IPv4, and run curl against the same GraphQL URL from the same environment as `next dev`."

  return undefined
}

/** Thrown when every candidate GraphQL URL failed (network, HTTP, or GraphQL errors). */
export class WordPressGraphqlFetchError extends Error {
  readonly attempts: WordPressGraphqlAttempt[]
  readonly hint?: string

  constructor(attempts: WordPressGraphqlAttempt[]) {
    const primary = attempts[0]
    const summary = primary
      ? primary.summary
      : "No GraphQL endpoints configured"
    super(
      attempts.length > 1
        ? `${summary} (tried ${attempts.length} URLs; see details)`
        : summary,
    )
    this.name = "WordPressGraphqlFetchError"
    this.attempts = attempts
    this.hint = hintForFetchFailure(attempts)
  }

  static isInstance(e: unknown): e is WordPressGraphqlFetchError {
    return e instanceof WordPressGraphqlFetchError
  }
}

/**
 * @param revalidate - ISR; short for the prototype. Override per-call if needed.
 */
export async function fetchWordPressGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  revalidateSeconds: number = 10,
): Promise<T> {
  const candidates = getWordPressGraphQLEndpointCandidates()
  const attempts: WordPressGraphqlAttempt[] = []

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: revalidateSeconds, tags: ["wp"] },
      })

      if (!res.ok) {
        attempts.push({
          url,
          summary: `HTTP ${res.status} ${res.statusText}`.trim(),
        })
        continue
      }

      const body = (await res.json()) as GraphqlResponse<T>
      if (body.errors?.length) {
        attempts.push({
          url,
          summary: body.errors.map((e) => e.message).join("; "),
        })
        continue
      }
      if (body.data === undefined) {
        attempts.push({ url, summary: "Response JSON missing `data`" })
        continue
      }
      return body.data
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      const code = errnoCode(err)
      const nested = formatErrorCauseChain(err.cause)
      const causeChain =
        [code && `errno: ${code}`, nested].filter(Boolean).join(" → ") ||
        undefined
      attempts.push({
        url,
        summary: err.message,
        causeChain,
      })
    }
  }

  throw new WordPressGraphqlFetchError(attempts)
}
