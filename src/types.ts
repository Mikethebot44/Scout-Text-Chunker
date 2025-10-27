export interface Chunk {
  id: string;
  text: string;
  start: number;
  end: number;
  metadata?: Record<string, any>;
}

export interface Chunker {
  chunk(text: string): Promise<Chunk[]>;
  stats?(): Record<string, any>;
}

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}

export type ThresholdingStrategy =
  | "zscore"
  | "percentile"
  | "localMinima"
  | "gradient"
  | "texttiling"
  | "c99"
  | "bayesian";

export type ChunkerType =
  | "fixed"
  | "recursive"
  | "semantic"
  | "hybrid"
  | "topic"
  | "sliding";

export interface ChunkerOptions {
  type: ChunkerType;
  chunkSize?: number;
  chunkOverlap?: number;
  embedder?: Embedder;
  thresholding?: ThresholdingStrategy;
  minChunkSize?: number;
  maxChunkSize?: number;
  maxConcurrentEmbeddings?: number;
  smoothingWindow?: number;
  percentile?: number;
  gradientThreshold?: number;
  zScoreK?: number;
  topicCount?: number;
}

export interface SentenceBoundary {
  sentence: string;
  start: number;
  end: number;
}
