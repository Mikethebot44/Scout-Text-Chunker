import { SentenceBoundary } from "../types";

const SENTENCE_REGEX = /(?<=[.!?])\s+/;
const PARAGRAPH_REGEX = /\n{2,}/;

export interface Token {
  value: string;
  start: number;
  end: number;
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    const start = index;
    const end = index + part.length;
    tokens.push({ value: part, start, end });
    index = end;
  }
  return tokens.filter((token) => token.value.trim().length > 0);
}

export function countTokens(text: string): number {
  return tokenize(text).length;
}

export function splitIntoSentences(text: string): SentenceBoundary[] {
  const sentences: SentenceBoundary[] = [];
  let offset = 0;
  for (const paragraph of text.split(PARAGRAPH_REGEX)) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      offset += paragraph.length + 2;
      continue;
    }
    const fragments = trimmed.split(SENTENCE_REGEX);
    for (const fragment of fragments) {
      const start = text.indexOf(fragment, offset);
      const end = start + fragment.length;
      sentences.push({ sentence: fragment, start, end });
      offset = end;
    }
    offset += 2;
  }
  if (!sentences.length && text.trim()) {
    sentences.push({ sentence: text.trim(), start: 0, end: text.length });
  }
  return sentences;
}

export function splitIntoParagraphs(text: string): SentenceBoundary[] {
  const paragraphs: SentenceBoundary[] = [];
  let cursor = 0;
  for (const segment of text.split(PARAGRAPH_REGEX)) {
    const trimmed = segment.trim();
    if (!trimmed) {
      cursor += segment.length + 2;
      continue;
    }
    const start = text.indexOf(trimmed, cursor);
    const end = start + trimmed.length;
    paragraphs.push({ sentence: trimmed, start, end });
    cursor = end + 2;
  }
  if (!paragraphs.length && text.trim()) {
    paragraphs.push({ sentence: text.trim(), start: 0, end: text.length });
  }
  return paragraphs;
}
