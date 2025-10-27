import type { Embedder } from "../types";

export type LocalEmbedFunction = (texts: string[]) => Promise<number[][]> | number[][];

export class LocalModelEmbedder implements Embedder {
  constructor(private readonly embedFn: LocalEmbedFunction) {}

  async embed(texts: string[]): Promise<number[][]> {
    const result = await this.embedFn(texts);
    return result;
  }
}
