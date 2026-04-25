import { notFound } from "next/navigation"

import { BlockRenderer } from "./block-renderer"
import { getContentNodeByUri } from "../lib/wp-block-query"

type WpContentPageProps = {
  uri: string
}

export async function WpContentPage({ uri }: WpContentPageProps) {
  let data: Awaited<ReturnType<typeof getContentNodeByUri>> | null = null
  let errorMessage: string | null = null

  try {
    data = await getContentNodeByUri(uri)
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "Unknown error calling WPGraphQL"
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-red-800">Chadpress renderer</h1>
        <p className="mt-4 text-neutral-700">
          <span className="font-medium">Could not load WordPress via GraphQL.</span>{" "}
          {errorMessage}
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          URI: <code className="rounded bg-neutral-100 px-1.5 py-0.5">{uri}</code>. Ensure
          DDEV is running, <code className="rounded bg-neutral-100 px-1.5 py-0.5">WORDPRESS_GRAPHQL_URL</code>{" "}
          is correct, and WPGraphQL + WPGraphQL Content Blocks are active.
        </p>
      </div>
    )
  }

  const node = data?.contentNode
  if (!node) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm text-neutral-500">
        WordPress URI <code>{uri}</code> · {node.__typename}
      </p>
      {node.title && (
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
          {node.title}
        </h1>
      )}
      <div className="mt-8">
        <BlockRenderer blocks={node.editorBlocks} />
      </div>
    </main>
  )
}
