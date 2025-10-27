import { v4 as uuid } from "uuid";
import { Chunk, Chunker, ChunkerOptions } from "../types";
import { splitIntoParagraphs, splitIntoSentences, tokenize } from "../utils/tokenizer";

export class RecursiveChunker implements Chunker {
  private readonly chunkSize: number;

  constructor(options: ChunkerOptions) {
    this.chunkSize = options.chunkSize ?? 500;
  }

  async chunk(text: string): Promise<Chunk[]> {
    const paragraphs = splitIntoParagraphs(text);
    const chunks: Chunk[] = [];

    for (const paragraph of paragraphs) {
      if (this.tokenCount(paragraph.sentence) <= this.chunkSize) {
        chunks.push({ id: uuid(), text: paragraph.sentence, start: paragraph.start, end: paragraph.end });
      } else {
        chunks.push(...this.splitParagraph(paragraph.sentence, paragraph.start));
      }
    }

    return this.mergeSmallChunks(chunks);
  }

  private splitParagraph(paragraph: string, offset: number): Chunk[] {
    const sentences = splitIntoSentences(paragraph);
    const chunks: Chunk[] = [];
    let current: string[] = [];
    let start = offset;

    for (const sentence of sentences) {
      const tentative = [...current, sentence.sentence].join(" ");
      if (this.tokenCount(tentative) > this.chunkSize && current.length) {
        const text = current.join(" ");
        const chunkStart = start;
        const chunkEnd = chunkStart + text.length;
        chunks.push({ id: uuid(), text, start: chunkStart, end: chunkEnd });
        current = [sentence.sentence];
        start = offset + sentence.start;
      } else {
        if (!current.length) {
          start = offset + sentence.start;
        }
        current.push(sentence.sentence);
      }
    }

    if (current.length) {
      const text = current.join(" ");
      const chunkStart = start;
      const chunkEnd = chunkStart + text.length;
      chunks.push({ id: uuid(), text, start: chunkStart, end: chunkEnd });
    }

    return chunks.flatMap((chunk) =>
      this.tokenCount(chunk.text) > this.chunkSize
        ? this.splitTokens(chunk.text, chunk.start)
        : chunk
    );
  }

  private splitTokens(text: string, offset: number): Chunk[] {
    const tokens = tokenize(text);
    const chunks: Chunk[] = [];
    for (let i = 0; i < tokens.length; i += this.chunkSize) {
      const slice = tokens.slice(i, i + this.chunkSize);
      const chunkText = slice.map((token) => token.value).join(" ");
      const start = offset + slice[0].start;
      const end = offset + slice[slice.length - 1].end;
      chunks.push({ id: uuid(), text: chunkText, start, end });
    }
    return chunks;
  }

  private mergeSmallChunks(chunks: Chunk[]): Chunk[] {
    if (!chunks.length) return [];
    const merged: Chunk[] = [];
    let buffer = chunks[0];

    for (let i = 1; i < chunks.length; i++) {
      const candidate = chunks[i];
      if (this.tokenCount(buffer.text + " " + candidate.text) <= this.chunkSize) {
        buffer = {
          id: buffer.id,
          text: `${buffer.text} ${candidate.text}`.trim(),
          start: buffer.start,
          end: candidate.end
        };
      } else {
        merged.push(buffer);
        buffer = candidate;
      }
    }
    merged.push(buffer);
    return merged;
  }

  private tokenCount(text: string): number {
    return tokenize(text).length;
  }
}
