import type { Embedder } from "../types";

export interface HuggingFaceEmbedderOptions {
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export class HuggingFaceEmbedder implements Embedder {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(options: HuggingFaceEmbedderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.HUGGINGFACE_API_KEY;
    this.model = options.model ?? "sentence-transformers/all-MiniLM-L6-v2";
    this.endpoint = options.endpoint ?? `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const responses: number[][] = [];
    for (const text of texts) {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({ inputs: text })
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(`Hugging Face embedding request failed: ${message}`);
      }
      const data = (await response.json()) as number[][] | number[];
      responses.push(Array.isArray(data[0]) ? (data as number[][])[0] : (data as number[]));
    }
    return responses;
  }
}
