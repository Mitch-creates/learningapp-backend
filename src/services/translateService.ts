import { TranslationPayload } from "../constants/apiConstants";

const AZURE_TRANSLATE_ENDPOINT =
  process.env.AZURE_TRANSLATE_ENDPOINT ||
  "https://api.cognitive.microsofttranslator.com";
const AZURE_TRANSLATE_KEY = process.env.AZURE_TRANSLATE_KEY!;
const AZURE_TRANSLATE_REGION = process.env.AZURE_TRANSLATE_REGION || ""; 

export async function processTranslation(
  p: TranslationPayload
): Promise<{ translated: string | null; detectedSource?: string | null }> {
  if (!AZURE_TRANSLATE_KEY) {
    throw new Error("AZURE_TRANSLATOR_KEY missing");
  }

  const qs = new URLSearchParams({
    "api-version": "3.0",
    to: p.targetLanguage,
  });
  if (p.sourceLanguage) qs.set("from", p.sourceLanguage);

  const r = await fetch(
    `${AZURE_TRANSLATE_ENDPOINT}/translate?${qs.toString()}`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_TRANSLATE_KEY,
        "Ocp-Apim-Subscription-Region": AZURE_TRANSLATE_REGION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ Text: p.text }]),
    }
  );

  if (!r.ok) {
    const err = await r.text().catch(() => "");
    throw new Error(`Translator ${r.status}: ${err}`);
  }

  const data: any[] = await r.json();
  const translated = data?.[0]?.translations?.[0]?.text ?? null;
  const detectedSource =
    p.sourceLanguage || data?.[0]?.detectedLanguage?.language || null;

  return { translated, detectedSource };
}
