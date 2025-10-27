import { ChunkerOptions, ChunkerType } from "../types";
import { FixedChunker } from "../chunkers/FixedChunker";
import { RecursiveChunker } from "../chunkers/RecursiveChunker";
import { SemanticChunker } from "../chunkers/SemanticChunker";
import { HybridChunker } from "../chunkers/HybridChunker";
import { TopicChunker } from "../chunkers/TopicChunker";
import { SlidingWindowChunker } from "../chunkers/SlidingWindowChunker";
import type { Chunker } from "../types";

const registry = new Map<ChunkerType | string, (options: ChunkerOptions) => Chunker>();

registry.set("fixed", (options) => new FixedChunker(options));
registry.set("recursive", (options) => new RecursiveChunker(options));
registry.set("semantic", (options) => new SemanticChunker(options));
registry.set("hybrid", (options) => new HybridChunker(options));
registry.set("topic", (options) => new TopicChunker(options));
registry.set("sliding", (options) => new SlidingWindowChunker(options));

export function registerChunker(type: string, factory: (options: ChunkerOptions) => Chunker) {
  registry.set(type, factory);
}

export function createChunker(options: ChunkerOptions): Chunker {
  const factory = registry.get(options.type);
  if (!factory) {
    throw new Error(`Unknown chunker type: ${options.type}`);
  }
  return factory(options);
}
