# ChunkForge SDK

ChunkForge provides a unified TypeScript SDK for splitting long-form text into semantically coherent “chunks” suitable for embedding, retrieval, or large language model (LLM) input. It exposes a consistent interface across fixed, structural, semantic, hybrid, and topic-aware chunkers along with pluggable embedding providers.

## Getting started

```bash
npm install
npm run build
```

### Quick example

```ts
import { createChunker, OpenAIEmbedder } from "chunkforge-sdk";

const chunker = createChunker({
  type: "semantic",
  embedder: new OpenAIEmbedder({ apiKey: process.env.OPENAI_API_KEY })
});

const chunks = await chunker.chunk(longText);
```

## Available chunkers

| Chunker | Description |
| --- | --- |
| `fixed` | Token-count based segmentation with overlap control. |
| `recursive` | Structural splitting with paragraph/sentence fallback. |
| `semantic` | Embedding-driven similarity based boundary detection. |
| `hybrid` | Structural-first, semantic-within section segmentation. |
| `topic` | Clusters sentences using k-means topic assignments. |
| `sliding` | Overlapping sliding windows for streaming workloads. |

## Testing

```bash
npm test
```
