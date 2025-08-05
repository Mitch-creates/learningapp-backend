import { LangGuess, Span } from "../constants/helperConstants";
import { franc } from "franc-min";
import langs from "langs";

const L = {
  OPEN: "«",
  CLOSE: "»",
  ELLIPSIS: "…",
  SEARCH_RADIUS: 1000, // allow for bigger drifts
};

/** Normalize a string to NFC */
export function normalizeNFC(text: string): string {
  return text.normalize("NFC");
}

/** Clamp an integer to [min,max] */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Verify and realign the span against a (already normalized) context. */
export function verifyAndRealign(
  normalizedContext: string,
  span: Span
): { start: number; end: number; text: string } {
  let start = Math.min(span.start_utf16, span.end_utf16);
  let end = Math.max(span.start_utf16, span.end_utf16);

  start = clamp(start, 0, normalizedContext.length);
  end = clamp(end, start, normalizedContext.length);

  // Normalize the span text too (critical if server normalized context)
  const sel = normalizeNFC(span.text);

  // Exact match at given indices?
  if (normalizedContext.slice(start, end) === sel) {
    return { start, end, text: sel };
  }

  // Search near the intended start
  const lo = clamp(start - L.SEARCH_RADIUS, 0, normalizedContext.length);
  const hi = clamp(end + L.SEARCH_RADIUS, 0, normalizedContext.length);
  const windowStr = normalizedContext.slice(lo, hi);
  const nearby = windowStr.indexOf(sel);
  if (nearby !== -1) {
    const s2 = lo + nearby;
    return { start: s2, end: s2 + sel.length, text: sel };
  }

  // Fall back: global search (last resort)
  const global = normalizedContext.indexOf(sel);
  if (global !== -1) {
    return { start: global, end: global + sel.length, text: sel };
  }

  // Give back the original indices; caller can decide what to do
  return { start, end, text: sel };
}

/** Insert « » around [start,end) in the normalized context. */
export function markSpan(
  normalizedContext: string,
  start: number,
  end: number
): string {
  return (
    normalizedContext.slice(0, start) +
    L.OPEN +
    normalizedContext.slice(start, end) +
    L.CLOSE +
    normalizedContext.slice(end)
  );
}

/** Trim to a window around [a,b) and add ellipses if truncated. */
export function windowed(
  str: string,
  a: number,
  b: number,
  pad: number = 400
): string {
  const lo = Math.max(0, a - pad);
  const hi = Math.min(str.length, b + pad);
  return (
    (lo > 0 ? L.ELLIPSIS : "") +
    str.slice(lo, hi) +
    (hi < str.length ? L.ELLIPSIS : "")
  );
}

/**
 * Full pipeline:
 * - normalize context & span text
 * - verify/realign indices
 * - mark in the FULL text
 * - window around the markers
 * Returns: snippet without markers, and snippet with markers.
 */
export function getContextSnippet(
  fullText: string,
  span: Span,
  pad: number = 400
): { snippet: string; markedSnippet: string } {
  const normalized = normalizeNFC(fullText);
  const { start, end } = verifyAndRealign(normalized, span);

  const markedFull = markSpan(normalized, start, end);
  const a = markedFull.indexOf(L.OPEN);
  const b = markedFull.indexOf(L.CLOSE, a + 1);
  if (a === -1 || b === -1) {
    // Fallback: no markers found (shouldn’t happen)
    const rawSnippet = windowed(normalized, start, end, pad);
    return {
      snippet: rawSnippet,
      markedSnippet: rawSnippet, // degraded but safe
    };
  }

  const markedSnippet = windowed(markedFull, a, b + 1, pad);
  const snippet = stripMarkers(markedSnippet);
  return { snippet, markedSnippet };
}

export function stripMarkers(s: string, open = "«", close = "»") {
  return s.split(open).join("").split(close).join("");
}

export function detectLanguageFranc(text: string): LangGuess {
  const s = text.normalize("NFC");
  const code3 = franc(s, { minLength: 20 }); // e.g., 'eng', 'deu'

  if (code3 === "und") return { lang: "und", confidence: 0, method: "franc" };

  const info = langs.where("3", code3);
  const code2 = (info && (info as any)["1"]) || "und"; // map to ISO-639-1
  return { lang: code2, confidence: 0.9, method: "franc" };
}

export function autonymFromIso1(code: string): string | null {
  const hit = langs.where("1", code.toLowerCase());
  return hit ? hit.local : null; // e.g., "Deutsch" for "de"
}

// --- Script heuristics (fast early exits) ---
const RE = {
  han: /[\u4E00-\u9FFF\u3400-\u4DBF]/g, // CJK Han
  hiragana: /[\u3040-\u309F]/g,
  katakana: /[\u30A0-\u30FF]/g,
  hangul: /[\uAC00-\uD7AF]/g,
  arabic: /[\u0600-\u06FF]/g,
  cyrillic: /[\u0400-\u04FF]/g,
  hebrew: /[\u0590-\u05FF]/g,
  devan: /[\u0900-\u097F]/g,
  thai: /[\u0E00-\u0E7F]/g,
  greek: /[\u0370-\u03FF]/g,
};

// --- Minimal stopword lists for Latin-script languages ---
const STOP: Record<string, string[]> = {
  en: [
    "the",
    "and",
    "to",
    "of",
    "in",
    "is",
    "for",
    "on",
    "with",
    "that",
    "it",
    "as",
    "are",
    "was",
    "be",
  ],
  de: [
    "der",
    "die",
    "das",
    "und",
    "ist",
    "nicht",
    "ein",
    "eine",
    "zu",
    "wir",
    "sie",
    "ich",
    "mit",
    "für",
    "auf",
  ],
  fr: [
    "le",
    "la",
    "les",
    "et",
    "de",
    "des",
    "en",
    "pour",
    "que",
    "est",
    "une",
    "un",
    "dans",
    "avec",
  ],
  es: [
    "el",
    "la",
    "los",
    "las",
    "y",
    "de",
    "que",
    "en",
    "por",
    "para",
    "con",
    "no",
    "una",
    "es",
    "un",
  ],
  nl: ["de", "het", "en", "van", "een", "is", "niet", "met"],
  it: [
    "il",
    "la",
    "le",
    "e",
    "di",
    "che",
    "in",
    "per",
    "è",
    "una",
    "un",
    "con",
    "non",
  ],
  pt: [
    "o",
    "a",
    "os",
    "as",
    "e",
    "de",
    "que",
    "em",
    "para",
    "com",
    "não",
    "uma",
    "um",
  ],
  sv: ["och", "att", "det", "som", "en", "är", "inte", "med"],
  da: ["og", "at", "det", "som", "en", "er", "ikke", "med"],
  no: ["og", "det", "som", "en", "er", "ikke", "med"],
  pl: ["i", "w", "nie", "jest", "z", "że", "na", "się"],
  tr: ["ve", "bir", "bu", "için", "ile", "değil", "olan"],
};

function count(re: RegExp, s: string) {
  const m = s.match(re);
  return m ? m.length : 0;
}

function latinStopwordScore(text: string, lang: string) {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 0;
  const set = new Set(STOP[lang] || []);
  const hits = words.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0);
  return hits / words.length; // simple ratio
}

/** Heuristic, zero-dependency language detection. */
export function detectLanguageHeuristic(text: string): LangGuess {
  const s = stripMarkers(text.normalize("NFC")).trim();
  if (s.length < 2) return { lang: "und", confidence: 0, method: "heuristic" };

  // Script-based detection
  const han = count(RE.han, s);
  const hira = count(RE.hiragana, s);
  const kata = count(RE.katakana, s);
  const hang = count(RE.hangul, s);
  if (hang > 5 && hang > han)
    return { lang: "ko", confidence: 0.98, method: "heuristic" };
  if (hira + kata > 5)
    return { lang: "ja", confidence: 0.98, method: "heuristic" };
  if (han > 10) return { lang: "zh", confidence: 0.95, method: "heuristic" };
  if (count(RE.arabic, s) > 10)
    return { lang: "ar", confidence: 0.98, method: "heuristic" };
  if (count(RE.cyrillic, s) > 10)
    return { lang: "ru", confidence: 0.9, method: "heuristic" };
  if (count(RE.hebrew, s) > 6)
    return { lang: "he", confidence: 0.98, method: "heuristic" };
  if (count(RE.devan, s) > 6)
    return { lang: "hi", confidence: 0.9, method: "heuristic" };
  if (count(RE.thai, s) > 6)
    return { lang: "th", confidence: 0.98, method: "heuristic" };
  if (count(RE.greek, s) > 6)
    return { lang: "el", confidence: 0.98, method: "heuristic" };

  // Latin-script: choose best stopword score
  const candidates = [
    "de",
    "en",
    "fr",
    "es",
    "nl",
    "it",
    "pt",
    "sv",
    "da",
    "no",
    "pl",
    "tr",
  ];
  let bestLang = "und";
  let bestScore = 0;
  for (const lang of candidates) {
    const score = latinStopwordScore(s, lang);
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  if (bestScore >= 0.01) {
    const confidence = Math.min(0.99, 0.5 + bestScore * 10); // lightweight mapping
    return { lang: bestLang, confidence, method: "heuristic" };
  }

  return { lang: "und", confidence: 0, method: "heuristic" };
}
