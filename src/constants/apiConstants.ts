export interface ExplanationPayload {
  startSelection: number;
  endSelection: number;
  selectedText: string;
  fullText: string;
}

export interface TranslationPayload {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string; // Optional, if not provided, auto-detection will be used
}

export interface TextToSpeechPayload {
  text: string;
  sourceLanguage?: string; // Optional, if not provided, auto-detection will be used
  altVoice?: boolean;
  format?: string; // optional: Azure output format
}

export interface LanguageDetectionPayload {
  text: string;
  debug?: boolean; // include debug info in response
}

// Optional default values or configuration
export const DEFAULT_WORD_COUNT = 4;
