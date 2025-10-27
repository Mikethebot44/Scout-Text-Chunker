import { v4 as uuid } from "uuid";
import { Chunk, Chunker, ChunkerOptions, Embedder } from "../types";
import { splitIntoSentences } from "../utils/tokenizer";
import { tokenize } from "../utils/tokenizer";

class LexicalTopicEmbedder implements Embedder {
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

export class TopicChunker implements Chunker {
  private readonly embedder: Embedder;
  private readonly topicCount?: number;

  constructor(options: ChunkerOptions) {
    this.embedder = options.embedder ?? new LexicalTopicEmbedder();
    this.topicCount = options.topicCount;
  }

  async chunk(text: string): Promise<Chunk[]> {
    const sentences = splitIntoSentences(text);
    if (!sentences.length) return [];
    const vectors = await this.embedder.embed(sentences.map((s) => s.sentence));
    const k = Math.min(
      sentences.length,
      this.topicCount ?? Math.max(2, Math.round(Math.sqrt(sentences.length)))
    );
    const assignments = this.kMeans(vectors, k);

    const chunks: Chunk[] = [];
    let currentCluster = assignments[0];
    let startIndex = 0;
    for (let i = 1; i < assignments.length; i++) {
      if (assignments[i] !== currentCluster) {
        const startSentence = sentences[startIndex];
        const endSentence = sentences[i - 1];
        const chunkText = sentences.slice(startIndex, i).map((s) => s.sentence).join(" ");
        chunks.push({ id: uuid(), text: chunkText, start: startSentence.start, end: endSentence.end, metadata: { cluster: currentCluster } });
        startIndex = i;
        currentCluster = assignments[i];
      }
    }

    const startSentence = sentences[startIndex];
    const endSentence = sentences[sentences.length - 1];
    const chunkText = sentences.slice(startIndex).map((s) => s.sentence).join(" ");
    chunks.push({ id: uuid(), text: chunkText, start: startSentence.start, end: endSentence.end, metadata: { cluster: currentCluster } });

    return chunks;
  }

  private kMeans(vectors: number[][], k: number, iterations = 20): number[] {
    const centroids = vectors.slice(0, k).map((vec) => [...vec]);
    const assignments = new Array(vectors.length).fill(0);

    for (let iteration = 0; iteration < iterations; iteration++) {
      let changed = false;
      for (let i = 0; i < vectors.length; i++) {
        let bestIndex = 0;
        let bestDistance = Infinity;
        for (let c = 0; c < k; c++) {
          const distance = this.euclideanDistance(vectors[i], centroids[c]);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = c;
          }
        }
        if (assignments[i] !== bestIndex) {
          assignments[i] = bestIndex;
          changed = true;
        }
      }

      if (!changed) break;

      const sums = Array.from({ length: k }, () => new Array(vectors[0].length).fill(0));
      const counts = new Array(k).fill(0);
      vectors.forEach((vector, index) => {
        const cluster = assignments[index];
        counts[cluster]++;
        for (let d = 0; d < vector.length; d++) {
          sums[cluster][d] += vector[d];
        }
      });
      for (let c = 0; c < k; c++) {
        if (counts[c] === 0) continue;
        centroids[c] = sums[c].map((value) => value / counts[c]);
      }
    }

    return assignments;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    const length = Math.max(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < length; i++) {
      const diff = (a[i] ?? 0) - (b[i] ?? 0);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
}
