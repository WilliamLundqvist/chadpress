import {
  getWordPressGraphQLEndpointCandidates,
  WordPressGraphqlFetchError,
} from "../lib/wordpress";

export type WpGraphqlErrorPanelProps = {
  uri: string;
  error: unknown;
};

export function WpGraphqlErrorPanel({ uri, error }: WpGraphqlErrorPanelProps) {
  const isDev = process.env.NODE_ENV === "development";
  const envUrl = process.env.WORDPRESS_GRAPHQL_URL;
  const candidates = getWordPressGraphQLEndpointCandidates();
  const message =
    error instanceof Error ? error.message : "Unknown error calling WPGraphQL";
  const graphqlError = WordPressGraphqlFetchError.isInstance(error)
    ? error
    : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-red-800">
        Chadpress renderer
      </h1>
      <p className="mt-4 text-neutral-700">
        <span className="font-medium">
          Could not load WordPress via GraphQL.
        </span>{" "}
        {message}
      </p>

      {graphqlError?.hint && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span className="font-medium">Likely cause: </span>
          {graphqlError.hint}
        </p>
      )}

      {graphqlError && graphqlError.attempts.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-neutral-800">
            Request attempts (server-side{" "}
            <code className="rounded bg-neutral-100 px-1">fetch</code>, not your
            browser)
          </p>
          <ul className="mt-2 list-inside list-disc space-y-2 text-sm text-neutral-700">
            {graphqlError.attempts.map((a) => (
              <li key={a.url}>
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                  {a.url}
                </code>
                <span className="text-neutral-600"> — {a.summary}</span>
                {a.causeChain && (
                  <span className="mt-0.5 block pl-4 text-xs text-neutral-500">
                    {a.causeChain}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-sm text-neutral-500">
        Content URI in this app:{" "}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5">{uri}</code>
      </p>

      {isDev && (
        <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
          <p className="font-medium text-neutral-900">Development diagnostics</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-neutral-600">
            <li>
              <code className="rounded bg-white px-1">WORDPRESS_GRAPHQL_URL</code>
              {envUrl ? (
                <>
                  :{" "}
                  <code className="rounded bg-white px-1 break-all">{envUrl}</code>
                </>
              ) : (
                " is unset (using built-in DDEV defaults when no env is set)."
              )}
            </li>
            <li>
              URLs tried (in order):{" "}
              {candidates.map((u) => (
                <code
                  key={u}
                  className="mr-1 rounded bg-white px-1 text-xs break-all"
                >
                  {u}
                </code>
              ))}
            </li>
          </ul>
        </div>
      )}

      <p className="mt-4 text-sm text-neutral-500">
        Checklist: DDEV (or WP) running; WPGraphQL + WPGraphQL Content Blocks
        active; URL reachable from the same OS/process as{" "}
        <code className="rounded bg-neutral-100 px-1">next dev</code> (try{" "}
        <code className="rounded bg-neutral-100 px-1">curl -I</code> on that
        GraphQL URL).
      </p>
    </div>
  );
}
