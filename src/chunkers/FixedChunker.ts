import { v4 as uuid } from "uuid";
import { Chunk, Chunker, ChunkerOptions } from "../types";
import { tokenize } from "../utils/tokenizer";

export class FixedChunker implements Chunker {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(options: ChunkerOptions) {
    this.chunkSize = options.chunkSize ?? 500;
    this.chunkOverlap = options.chunkOverlap ?? Math.floor(this.chunkSize / 10);
  }

  async chunk(text: string): Promise<Chunk[]> {
    const tokens = tokenize(text);
    if (!tokens.length) return [];
    const chunks: Chunk[] = [];
    let startIndex = 0;

    while (startIndex < tokens.length) {
      const endIndex = Math.min(tokens.length, startIndex + this.chunkSize);
      const chunkTokens = tokens.slice(startIndex, endIndex);
      const chunkText = chunkTokens.map((token) => token.value).join(" ").trim();
      const start = chunkTokens[0].start;
      const end = chunkTokens[chunkTokens.length - 1].end;
      chunks.push({ id: uuid(), text: chunkText, start, end });
      if (endIndex === tokens.length) break;
      startIndex = Math.max(0, endIndex - this.chunkOverlap);
    }

    return chunks;
  }
}
