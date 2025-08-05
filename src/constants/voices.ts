export const VOICE: Record<string, { default: string; alt: string }> = {
  en: { default: "en-US-JennyNeural", alt: "en-GB-RyanNeural" },
  de: { default: "de-DE-KatjaNeural", alt: "de-DE-ConradNeural" },
  fr: { default: "fr-FR-DeniseNeural", alt: "fr-FR-HenriNeural" },
  es: { default: "es-ES-ElviraNeural", alt: "es-ES-AlvaroNeural" },
  nl: { default: "nl-NL-ColetteNeural", alt: "nl-NL-MaartenNeural" },
};

export function pickVoice(lang: string, useAlt = false) {
  const v = VOICE[lang.toLowerCase()];
  return v ? (useAlt ? v.alt : v.default) : VOICE.en.default;
}
