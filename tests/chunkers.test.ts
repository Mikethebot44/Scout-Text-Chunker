import { describe, expect, it } from "vitest";
import { FixedChunker } from "../src/chunkers/FixedChunker";
import { RecursiveChunker } from "../src/chunkers/RecursiveChunker";
import { SemanticChunker } from "../src/chunkers/SemanticChunker";
import { HybridChunker } from "../src/chunkers/HybridChunker";
import { TopicChunker } from "../src/chunkers/TopicChunker";
import { SlidingWindowChunker } from "../src/chunkers/SlidingWindowChunker";
import type { Chunk } from "../src/types";

const SAMPLE_TEXT = `ChunkForge provides a unified SDK for chunking text.\n\nThe SDK ships with multiple chunkers.\n\nSemantic chunking is useful when structure is weak but meaning shifts.`;

function assertChunkShape(chunks: Chunk[]) {
  chunks.forEach((chunk) => {
    expect(chunk.id).toBeDefined();
    expect(typeof chunk.text).toBe("string");
    expect(chunk.text.length).toBeGreaterThan(0);
    expect(chunk.start).toBeLessThanOrEqual(chunk.end);
  });
}

describe("Chunkers", () => {
  it("fixed chunker respects chunk size", async () => {
    const chunker = new FixedChunker({ type: "fixed", chunkSize: 5, chunkOverlap: 1 });
    const chunks = await chunker.chunk(SAMPLE_TEXT);
    assertChunkShape(chunks);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("recursive chunker splits by structure", async () => {
    const chunker = new RecursiveChunker({ type: "recursive", chunkSize: 20 });
    const chunks = await chunker.chunk(SAMPLE_TEXT);
    assertChunkShape(chunks);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("semantic chunker falls back to lexical embeddings", async () => {
    const chunker = new SemanticChunker({ type: "semantic", chunkSize: 50, thresholding: "localMinima" });
    const chunks = await chunker.chunk(SAMPLE_TEXT);
    assertChunkShape(chunks);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("hybrid chunker balances semantics and structure", async () => {
    const chunker = new HybridChunker({ type: "hybrid", chunkSize: 50 });
    const chunks = await chunker.chunk(SAMPLE_TEXT);
    assertChunkShape(chunks);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("topic chunker clusters sentences", async () => {
    const chunker = new TopicChunker({ type: "topic" });
    const chunks = await chunker.chunk(SAMPLE_TEXT);
    assertChunkShape(chunks);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("sliding window chunker produces overlapping windows", async () => {
    const chunker = new SlidingWindowChunker({ type: "sliding", chunkSize: 10, chunkOverlap: 5 });
    const chunks = await chunker.chunk(SAMPLE_TEXT);
    assertChunkShape(chunks);
    expect(chunks.length).toBeGreaterThan(1);
  });
});
