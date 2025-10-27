import { v4 as uuid } from "uuid";
import { Chunk, Chunker, ChunkerOptions, Embedder, ThresholdingStrategy } from "../types";
import { splitIntoSentences, tokenize } from "../utils/tokenizer";
import { pairwiseCosine } from "../utils/cosine";
import { percentile as percentileValue, zScoreThreshold } from "../utils/stats";
import { movingAverage } from "../utils/smoothing";
import { textTilingBoundaries } from "../algorithms/TextTiling";
import { c99Boundaries } from "../algorithms/C99";
import { bayesSegBoundaries } from "../algorithms/BayesSeg";

class LexicalEmbedder implements Embedder {
  async embed(texts: string[]): Promise<number[][]> {
    const dimension = 256;
    return texts.map((text) => {
      const vector = new Array(dimension).fill(0);
      const tokens = tokenize(text.toLowerCase());
      tokens.forEach((token) => {
        const hash = this.hash(token.value) % dimension;
        vector[hash] += 1;
      });
      return vector;
    });
  }

  private hash(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

export class SemanticChunker implements Chunker {
  private readonly chunkSize: number;
  private readonly strategy: ThresholdingStrategy;
  private readonly embedder: Embedder;
  private readonly zScoreK: number;
  private readonly smoothingWindow: number;
  private readonly percentile: number;
  private readonly gradientThreshold: number;

  constructor(options: ChunkerOptions) {
    this.chunkSize = options.chunkSize ?? 600;
    this.strategy = options.thresholding ?? "zscore";
    this.embedder = options.embedder ?? new LexicalEmbedder();
    this.zScoreK = options.zScoreK ?? 1.0;
    this.smoothingWindow = options.smoothingWindow ?? 3;
    this.percentile = options.percentile ?? 10;
    this.gradientThreshold = options.gradientThreshold ?? 0.15;
  }

  async chunk(text: string): Promise<Chunk[]> {
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return [];
    if (sentences.length === 1) {
      return [
        {
          id: uuid(),
          text: sentences[0].sentence,
          start: sentences[0].start,
          end: sentences[0].end
        }
      ];
    }

    const embeddings = await this.embedder.embed(sentences.map((sentence) => sentence.sentence));
    const similarities = pairwiseCosine(embeddings);
    const smoothed = movingAverage(similarities, this.smoothingWindow);
    const boundaryIndexes = await this.computeBoundaries(text, sentences.map((s) => s.sentence), smoothed);

    const chunks: Chunk[] = [];
    let lastIndex = 0;
    for (const index of boundaryIndexes) {
      const startSentence = sentences[lastIndex];
      const endSentence = sentences[index];
      const chunkText = sentences.slice(lastIndex, index + 1).map((sentence) => sentence.sentence).join(" ");
      chunks.push({ id: uuid(), text: chunkText, start: startSentence.start, end: endSentence.end });
      lastIndex = index + 1;
    }

    if (lastIndex < sentences.length) {
      const startSentence = sentences[lastIndex];
      const endSentence = sentences[sentences.length - 1];
      const chunkText = sentences.slice(lastIndex).map((sentence) => sentence.sentence).join(" ");
      chunks.push({ id: uuid(), text: chunkText, start: startSentence.start, end: endSentence.end });
    }

    return this.enforceChunkSize(chunks);
  }

  private async computeBoundaries(text: string, sentences: string[], similarities: number[]): Promise<number[]> {
    switch (this.strategy) {
      case "zscore":
        return this.zScoreBoundaries(similarities);
      case "percentile":
        return this.percentileBoundaries(similarities);
      case "localMinima":
        return this.localMinimaBoundaries(similarities);
      case "gradient":
        return this.gradientBoundaries(similarities);
      case "texttiling":
        return this.toSentenceIndexes(text, textTilingBoundaries(text));
      case "c99":
        return this.toSentenceIndexes(text, await c99Boundaries(text, this.embedder));
      case "bayesian":
        return this.toSentenceIndexes(text, bayesSegBoundaries(text));
      default:
        return this.zScoreBoundaries(similarities);
    }
  }

  private zScoreBoundaries(similarities: number[]): number[] {
    const threshold = zScoreThreshold(similarities, this.zScoreK);
    return similarities
      .map((value, index) => ({ value, index }))
      .filter(({ value }) => value < threshold)
      .map(({ index }) => index);
  }

  private percentileBoundaries(similarities: number[]): number[] {
    const threshold = percentileValue(similarities, this.percentile);
    return similarities
      .map((value, index) => ({ value, index }))
      .filter(({ value }) => value <= threshold)
      .map(({ index }) => index);
  }

  private localMinimaBoundaries(similarities: number[]): number[] {
    const boundaries: number[] = [];
    for (let i = 1; i < similarities.length - 1; i++) {
      if (similarities[i] < similarities[i - 1] && similarities[i] < similarities[i + 1]) {
        boundaries.push(i);
      }
    }
    return boundaries;
  }

  private gradientBoundaries(similarities: number[]): number[] {
    const boundaries: number[] = [];
    for (let i = 0; i < similarities.length - 1; i++) {
      const gradient = similarities[i + 1] - similarities[i];
      if (gradient < -this.gradientThreshold) {
        boundaries.push(i);
      }
    }
    return boundaries;
  }

  private toSentenceIndexes(text: string, boundaryPositions: number[]): number[] {
    const sentences = splitIntoSentences(text);
    const indexes: number[] = [];
    boundaryPositions.forEach((position) => {
      const index = sentences.findIndex((sentence) => sentence.end >= position);
      if (index !== -1) {
        indexes.push(index);
      }
    });
    return indexes;
  }

  private enforceChunkSize(chunks: Chunk[]): Chunk[] {
    const result: Chunk[] = [];
    let buffer: Chunk | null = null;
    for (const chunk of chunks) {
      if (tokenize(chunk.text).length > this.chunkSize * 1.5) {
        result.push(...this.splitLargeChunk(chunk));
        continue;
      }
      if (!buffer) {
        buffer = chunk;
        continue;
      }
      const combined = `${buffer.text} ${chunk.text}`.trim();
      if (tokenize(combined).length <= this.chunkSize) {
        buffer = {
          id: buffer.id,
          text: combined,
          start: buffer.start,
          end: chunk.end
        };
      } else {
        result.push(buffer);
        buffer = chunk;
      }
    }
    if (buffer) {
      result.push(buffer);
    }
    return result;
  }

  private splitLargeChunk(chunk: Chunk): Chunk[] {
    const tokens = tokenize(chunk.text);
    const pieces: Chunk[] = [];
    for (let i = 0; i < tokens.length; i += this.chunkSize) {
      const slice = tokens.slice(i, i + this.chunkSize);
      const text = slice.map((token) => token.value).join(" ");
      const startOffset = slice[0].start;
      const endOffset = slice[slice.length - 1].end;
      pieces.push({
        id: uuid(),
        text,
        start: chunk.start + startOffset,
        end: chunk.start + endOffset
      });
    }
    return pieces;
  }
}
