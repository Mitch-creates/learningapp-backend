// Used to prepare openai API requests. Keeps it clean and simple.
export interface Span {
  start_utf16: number;
  end_utf16: number;
  text: string;
}

export type LangGuess = {
  lang: string; // e.g., "en", "de", "zh", or "und" if unknown
  confidence: number; // 0..1
  method: "heuristic" | "franc";
};
