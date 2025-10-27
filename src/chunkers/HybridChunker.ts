import { v4 as uuid } from "uuid";
import { Chunk, Chunker, ChunkerOptions } from "../types";
import { splitIntoParagraphs, tokenize } from "../utils/tokenizer";
import { SemanticChunker } from "./SemanticChunker";

export class HybridChunker implements Chunker {
  private readonly semantic: SemanticChunker;
  private readonly minChunkSize: number;
  private readonly maxChunkSize: number;

  constructor(options: ChunkerOptions) {
    this.semantic = new SemanticChunker({ ...options, type: "semantic" });
    this.minChunkSize = options.minChunkSize ?? Math.floor((options.chunkSize ?? 600) / 2);
    this.maxChunkSize = options.maxChunkSize ?? (options.chunkSize ?? 600) * 1.5;
  }

  async chunk(text: string): Promise<Chunk[]> {
    const paragraphs = splitIntoParagraphs(text);
    const chunks: Chunk[] = [];

    for (const paragraph of paragraphs) {
      const tokens = tokenize(paragraph.sentence);
      if (tokens.length <= this.minChunkSize) {
        chunks.push({ id: uuid(), text: paragraph.sentence, start: paragraph.start, end: paragraph.end });
      } else {
        const semanticChunks = await this.semantic.chunk(paragraph.sentence);
        semanticChunks.forEach((chunk) => {
          chunks.push({
            ...chunk,
            start: paragraph.start + chunk.start,
            end: paragraph.start + chunk.end
          });
        });
      }
    }

    return this.balanceChunks(chunks);
  }

  private balanceChunks(chunks: Chunk[]): Chunk[] {
    const balanced: Chunk[] = [];
    let buffer: Chunk | null = null;

    for (const chunk of chunks) {
      if (!buffer) {
        buffer = chunk;
        continue;
      }
      const combined = `${buffer.text}\n${chunk.text}`.trim();
      const combinedTokens = tokenize(combined).length;
      if (combinedTokens < this.minChunkSize) {
        buffer = {
          id: buffer.id,
          text: combined,
          start: buffer.start,
          end: chunk.end
        };
      } else if (combinedTokens > this.maxChunkSize) {
        balanced.push(buffer);
        buffer = chunk;
      } else {
        buffer = {
          id: buffer.id,
          text: combined,
          start: buffer.start,
          end: chunk.end
        };
      }
    }

    if (buffer) {
      balanced.push(buffer);
    }

    return balanced;
  }
}
