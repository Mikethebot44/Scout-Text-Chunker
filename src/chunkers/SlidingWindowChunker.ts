import { v4 as uuid } from "uuid";
import { Chunk, Chunker, ChunkerOptions } from "../types";
import { splitIntoSentences, tokenize } from "../utils/tokenizer";

export class SlidingWindowChunker implements Chunker {
  private readonly chunkSize: number;
  private readonly overlap: number;

  constructor(options: ChunkerOptions) {
    this.chunkSize = options.chunkSize ?? 400;
    this.overlap = options.chunkOverlap ?? Math.floor(this.chunkSize / 4);
  }

  async chunk(text: string): Promise<Chunk[]> {
    const sentences = splitIntoSentences(text);
    if (!sentences.length) return [];

    const tokens = tokenize(text);
    if (!tokens.length) return [];

    const stride = Math.max(1, this.chunkSize - this.overlap);
    const chunks: Chunk[] = [];

    for (let start = 0; start < tokens.length; start += stride) {
      const end = Math.min(tokens.length, start + this.chunkSize);
      const chunkTokens = tokens.slice(start, end);
      const chunkText = chunkTokens.map((token) => token.value).join(" ").trim();
      const chunkStart = chunkTokens[0].start;
      const chunkEnd = chunkTokens[chunkTokens.length - 1].end;

      const boundaryAdjusted = this.expandToSentenceBoundaries(chunkStart, chunkEnd, sentences);
      chunks.push({ id: uuid(), text: chunkText, start: boundaryAdjusted.start, end: boundaryAdjusted.end });
      if (end === tokens.length) break;
    }

    return chunks;
  }

  private expandToSentenceBoundaries(start: number, end: number, sentences: ReturnType<typeof splitIntoSentences>): { start: number; end: number } {
    let expandedStart = start;
    let expandedEnd = end;
    for (const sentence of sentences) {
      if (sentence.start <= start && sentence.end >= start) {
        expandedStart = sentence.start;
      }
      if (sentence.start <= end && sentence.end >= end) {
        expandedEnd = sentence.end;
      }
    }
    return { start: expandedStart, end: expandedEnd };
  }
}
