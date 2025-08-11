import { TextToSpeechPayload } from "../constants/apiConstants";
import { pickVoice } from "../utils/voices";

const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION!;
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY!;

const LOCALE: Record<string, string> = {
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  nl: "nl-NL",
};

function normalizeLang2(input?: string) {
  // accepts "en", "en-US", "EN", etc. → "en"
  return (input || "en").slice(0, 2).toLowerCase();
}

function mimeForFormat(fmt: string) {
  if (fmt.includes("mp3")) return "audio/mpeg";
  if (fmt.includes("ogg")) return "audio/ogg";
  if (fmt.includes("wav") || fmt.includes("pcm")) return "audio/wav";
  return "application/octet-stream";
}

function escapeForXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function processTextToSpeech(
  p: TextToSpeechPayload
): Promise<{
  buffer: Buffer;
  contentType: string;
  meta: { lang: string; voice: string; format: string };
}> {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    throw new Error("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION missing");
  }

  const lang2 = normalizeLang2(p.sourceLanguage); // "de"
  const locale = LOCALE[lang2] ?? LOCALE.en; // "de-DE"
  const voice = pickVoice(lang2, !!p.altVoice); // "de-DE-KatjaNeural"
  const format = p.format || "audio-16khz-128kbitrate-mono-mp3";
  const contentType = mimeForFormat(format);

  const ssml = `<speak version="1.0" xml:lang="${locale}">
    <voice name="${voice}">${escapeForXml(p.text)}</voice>
  </speak>`;

  const endpoint = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": format,
    },
    body: ssml,
  });

  if (!r.ok) {
    const err = await r.text().catch(() => "");
    throw new Error(`TTS ${r.status}: ${err}`);
  }

  const buffer = Buffer.from(await r.arrayBuffer());
  return { buffer, contentType, meta: { lang: lang2, voice, format } };
}
