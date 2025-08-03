export interface ExplanationPayload {
  startSelection: number;
  endSelection: number;
  selectedText: string;
  fullText: string;
}

// Optional default values or configuration
export const DEFAULT_WORD_COUNT = 4;
