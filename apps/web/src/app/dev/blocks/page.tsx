import { notFound } from "next/navigation";

import { blockRegistry } from "@repo/ui/blocks";

import { BlockRenderer } from "../../../components/block-renderer";
import type { WpEditorBlock } from "../../../lib/wp-block-query";

type ExampleMeta = {
  name: string;
  title: string;
  example: {
    attributes: Record<string, unknown>;
    innerBlocks?: ExampleBlock[];
  };
};

type ExampleBlock = {
  name: string;
  attributes: Record<string, unknown>;
  innerBlocks?: ExampleBlock[];
};

function createGalleryBlock(
  example: ExampleBlock,
  id: string,
  parentClientId: string | null = null,
): WpEditorBlock {
  const clientId = `gallery-${id}`;
  return {
    __typename: "EditorBlock",
    name: example.name,
    clientId,
    parentClientId,
    attributes: example.attributes,
    innerBlocks: (example.innerBlocks ?? []).map((child, index) =>
      createGalleryBlock(child, `${id}-${index}`, clientId),
    ),
  };
}

export default function BlockGalleryPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const examples = Object.values(blockRegistry).map((definition, index) => {
    const meta = definition.meta as ExampleMeta;
    const block = createGalleryBlock({
      name: meta.name,
      attributes: meta.example.attributes,
      innerBlocks: meta.example.innerBlocks,
    }, `${index}-${meta.name}`);

    return { meta, block };
  });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <header>
        <p className="text-muted-foreground text-sm">Development only</p>
        <h1 className="text-3xl font-bold tracking-tight">
          Chadpress block gallery
        </h1>
      </header>

      {examples.map(({ meta, block }) => (
        <section className="grid gap-4 border-t pt-8" key={meta.name}>
          <div>
            <h2 className="text-lg font-semibold">{meta.title}</h2>
            <code className="text-muted-foreground text-xs">{meta.name}</code>
          </div>
          <div className="rounded-lg border p-6">
            <BlockRenderer blocks={[block]} />
          </div>
        </section>
      ))}
    </main>
  );
}
