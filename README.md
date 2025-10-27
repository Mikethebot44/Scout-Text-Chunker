# Scout Text Chunker SDK

Scout Text Chunker is a unified TypeScript toolkit for splitting long-form content into semantically coherent "chunks" that are easy to embed, store, and retrieve in Retrieval-Augmented Generation (RAG) pipelines. It exposes a consistent interface across fixed, structural, semantic, hybrid, and topic-aware chunkers along with pluggable embedding providers.

## Key features

- **One interface, many strategies** – switch between fixed, recursive, semantic, hybrid, topic, and sliding-window chunkers with a single factory function.
- **Bring your own embeddings** – use the built-in embedders or provide a custom implementation that matches your infrastructure.
- **Built for RAG systems** – every chunk includes token counts, parent/child relationships, and metadata hooks for downstream retrieval engines.
- **Framework agnostic** – works in Node.js, serverless runtimes, and modern build systems thanks to the ESM/CJS bundles included in the package.

## Installation

```bash
npm install scout-text-chunker
# or
pnpm add scout-text-chunker
# or
yarn add scout-text-chunker
```

## Quick start

```ts
import { createChunker, OpenAIEmbedder } from "scout-text-chunker";

type Input = {
  title: string;
  body: string;
};

const article: Input = {
  title: "Scaling Support Documentation",
  body: "Scout Text Chunker helps teams split knowledge base articles into reusable units..."
};

const chunker = createChunker({
  type: "semantic",
  embedder: new OpenAIEmbedder({ apiKey: process.env.OPENAI_API_KEY! })
});

const chunks = await chunker.chunk(article.body);
console.log(chunks[0]);
```

Each chunk contains the original text, token counts, and optional metadata describing its origin. You can persist this output in your vector store of choice.

## Choosing a chunker

| Chunker    | When to use it                                                                 |
|------------|---------------------------------------------------------------------------------|
| `fixed`    | Documents with uniform length sentences or when token budgets are strict.       |
| `recursive`| Structured content like Markdown or HTML that benefits from heading hierarchy.  |
| `semantic` | Narrative text where topic shifts are subtle and require embedding similarity.  |
| `hybrid`   | Semi-structured data where headings exist but need semantic boundaries within.  |
| `topic`    | Knowledge bases or FAQs that should be grouped by conceptual clusters.          |
| `sliding`  | Streaming or chat transcripts that require overlapping context windows.         |

Switching chunkers is as simple as changing the `type` passed to `createChunker`.

```ts
import { createChunker } from "scout-text-chunker";

const chunker = createChunker({
  type: "recursive",
  options: {
    maxTokens: 600,
    overlap: 80
  }
});
```

## Embedding strategies

The SDK ships with embedders that wrap popular providers.

```ts
import { createChunker, OpenAIEmbedder, CohereEmbedder } from "scout-text-chunker";

const openAIChunker = createChunker({
  type: "semantic",
  embedder: new OpenAIEmbedder({ apiKey: process.env.OPENAI_API_KEY! })
});

const cohereChunker = createChunker({
  type: "topic",
  embedder: new CohereEmbedder({ apiKey: process.env.COHERE_API_KEY! })
});
```

If you already have embeddings, implement the `Embedder` interface and pass it into the factory.

```ts
import { createChunker, Embedder } from "scout-text-chunker";

class LocalEmbedder implements Embedder {
  async embed(texts: string[]) {
    return texts.map((text) => Array.from(text, (char) => char.charCodeAt(0) / 255));
  }
}

const chunker = createChunker({
  type: "semantic",
  embedder: new LocalEmbedder()
});
```

## Attaching metadata

Every `chunker.chunk` call accepts optional metadata so you can preserve context.

```ts
const chunks = await chunker.chunk(article.body, {
  documentId: "support-doc-42",
  source: article.title
});
```

Metadata travels with each chunk, making it easier to trace responses back to the original source.

## CLI & automation

Scout Text Chunker plays nicely with build pipelines. Combine it with `tsup` or `ts-node` to preprocess documents before deployment, or bundle it into serverless functions that power your search endpoints.

## Testing & type safety

```bash
npm test
```

Vitest ensures chunkers behave consistently across text types, and TypeScript declarations are published alongside the package for first-class IDE support.

## Contributing

1. Clone the repository and install dependencies with `npm install`.
2. Run `npm run build` before submitting changes.
3. Ensure tests pass with `npm test`.

## License

MIT © Scout
