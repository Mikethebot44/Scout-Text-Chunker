import type { Embedder } from "../types";

export interface OpenAIEmbedderOptions {
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export class OpenAIEmbedder implements Embedder {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(options: OpenAIEmbedderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = options.model ?? "text-embedding-3-small";
    this.endpoint = options.endpoint ?? "https://api.openai.com/v1/embeddings";
    if (!this.apiKey) {
      throw new Error("OpenAI API key is required for OpenAIEmbedder");
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ input: texts, model: this.model })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`OpenAI embedding request failed: ${message}`);
    }

    const data = (await response.json()) as { data: { embedding: number[] }[] };
    return data.data.map((entry) => entry.embedding);
  }
}
