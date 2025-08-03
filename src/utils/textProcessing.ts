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

function stripMarkers(s: string, open = "«", close = "»") {
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
