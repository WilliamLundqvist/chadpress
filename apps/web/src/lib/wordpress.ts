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

/**
 * @param revalidate - ISR; short for the prototype. Override per-call if needed.
 */
export async function fetchWordPressGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  revalidateSeconds: number = 10,
): Promise<T> {
  const candidates = getWordPressGraphQLEndpointCandidates()
  let lastError: Error | null = null

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: revalidateSeconds, tags: ["wp"] },
      })

      if (!res.ok) {
        lastError = new Error(`WPGraphQL HTTP ${res.status} for ${url}`)
        continue
      }

      const body = (await res.json()) as GraphqlResponse<T>
      if (body.errors?.length) {
        lastError = new Error(body.errors.map((e) => e.message).join("; "))
        continue
      }
      if (body.data === undefined) {
        lastError = new Error("WPGraphQL response missing data")
        continue
      }
      return body.data
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }

  throw lastError ?? new Error("WPGraphQL request failed for all candidate URLs")
}
