interface Chunk {
    id: string;
    text: string;
    start: number;
    end: number;
    metadata?: Record<string, any>;
}
interface Chunker {
    chunk(text: string): Promise<Chunk[]>;
    stats?(): Record<string, any>;
}
interface Embedder {
    embed(texts: string[]): Promise<number[][]>;
}
type ThresholdingStrategy = "zscore" | "percentile" | "localMinima" | "gradient" | "texttiling" | "c99" | "bayesian";
type ChunkerType = "fixed" | "recursive" | "semantic" | "hybrid" | "topic" | "sliding";
interface ChunkerOptions {
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
interface SentenceBoundary {
    sentence: string;
    start: number;
    end: number;
}

declare function registerChunker(type: string, factory: (options: ChunkerOptions) => Chunker): void;
declare function createChunker(options: ChunkerOptions): Chunker;

declare class FixedChunker implements Chunker {
    private readonly chunkSize;
    private readonly chunkOverlap;
    constructor(options: ChunkerOptions);
    chunk(text: string): Promise<Chunk[]>;
}

declare class RecursiveChunker implements Chunker {
    private readonly chunkSize;
    constructor(options: ChunkerOptions);
    chunk(text: string): Promise<Chunk[]>;
    private splitParagraph;
    private splitTokens;
    private mergeSmallChunks;
    private tokenCount;
}

declare class SemanticChunker implements Chunker {
    private readonly chunkSize;
    private readonly strategy;
    private readonly embedder;
    private readonly zScoreK;
    private readonly smoothingWindow;
    private readonly percentile;
    private readonly gradientThreshold;
    constructor(options: ChunkerOptions);
    chunk(text: string): Promise<Chunk[]>;
    private computeBoundaries;
    private zScoreBoundaries;
    private percentileBoundaries;
    private localMinimaBoundaries;
    private gradientBoundaries;
    private toSentenceIndexes;
    private enforceChunkSize;
    private splitLargeChunk;
}

declare class HybridChunker implements Chunker {
    private readonly semantic;
    private readonly minChunkSize;
    private readonly maxChunkSize;
    constructor(options: ChunkerOptions);
    chunk(text: string): Promise<Chunk[]>;
    private balanceChunks;
}

declare class TopicChunker implements Chunker {
    private readonly embedder;
    private readonly topicCount?;
    constructor(options: ChunkerOptions);
    chunk(text: string): Promise<Chunk[]>;
    private kMeans;
    private euclideanDistance;
}

declare class SlidingWindowChunker implements Chunker {
    private readonly chunkSize;
    private readonly overlap;
    constructor(options: ChunkerOptions);
    chunk(text: string): Promise<Chunk[]>;
    private expandToSentenceBoundaries;
}

interface OpenAIEmbedderOptions {
    apiKey?: string;
    model?: string;
    endpoint?: string;
}
declare class OpenAIEmbedder implements Embedder {
    private readonly apiKey;
    private readonly model;
    private readonly endpoint;
    constructor(options?: OpenAIEmbedderOptions);
    embed(texts: string[]): Promise<number[][]>;
}

interface HuggingFaceEmbedderOptions {
    apiKey?: string;
    model?: string;
    endpoint?: string;
}
declare class HuggingFaceEmbedder implements Embedder {
    private readonly apiKey?;
    private readonly model;
    private readonly endpoint;
    constructor(options?: HuggingFaceEmbedderOptions);
    embed(texts: string[]): Promise<number[][]>;
}

type LocalEmbedFunction = (texts: string[]) => Promise<number[][]> | number[][];
declare class LocalModelEmbedder implements Embedder {
    private readonly embedFn;
    constructor(embedFn: LocalEmbedFunction);
    embed(texts: string[]): Promise<number[][]>;
}

export { Chunk, Chunker, ChunkerOptions, ChunkerType, Embedder, FixedChunker, HuggingFaceEmbedder, HuggingFaceEmbedderOptions, HybridChunker, LocalEmbedFunction, LocalModelEmbedder, OpenAIEmbedder, OpenAIEmbedderOptions, RecursiveChunker, SemanticChunker, SentenceBoundary, SlidingWindowChunker, ThresholdingStrategy, TopicChunker, createChunker, registerChunker };
