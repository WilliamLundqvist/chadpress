import { notFound } from "next/navigation";

import { BlockRenderer } from "./block-renderer";
import { WpGraphqlErrorPanel } from "./wp-graphql-error-panel";
import { getContentNodeByUri } from "../lib/wp-block-query";

type WpContentPageProps = {
  uri: string;
};

export async function WpContentPage({ uri }: WpContentPageProps) {
  let data: Awaited<ReturnType<typeof getContentNodeByUri>> | null = null;
  let caught: unknown = null;

  try {
    data = await getContentNodeByUri(uri);
  } catch (e) {
    caught = e;
  }

  if (caught) {
    return <WpGraphqlErrorPanel uri={uri} error={caught} />;
  }

  const node = data?.contentNode;
  if (!node) {
    notFound();
  }

  return (
    <main className="max-w-7xl mx-auto w-full px-6 py-12">
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
  );
}
