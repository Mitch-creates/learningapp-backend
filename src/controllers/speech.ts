import { FastifyReply, FastifyRequest } from "fastify";
import { TextToSpeechPayload } from "../constants/apiConstants";
import { processTextToSpeech } from "../services/textToSpeechService";
import { detectLanguageHeuristic as detectLanguage } from "../utils/textProcessing";

interface TtsRequest {
  Body: TextToSpeechPayload;
}

export async function ttsHandler(
  request: FastifyRequest<TtsRequest>,
  reply: FastifyReply
) {
  const payload = request.body;

  if (!payload?.text || !payload.text.trim()) {
    return reply.code(400).send({ error: "Text is required" });
  }

  // Auto-detect if missing
  if (!payload.sourceLanguage) {
    const g = detectLanguage(payload.text);
    if (g.lang !== "und") payload.sourceLanguage = g.lang; // e.g., "de"
  }

  try {
    const { buffer, contentType, meta } = await processTextToSpeech(payload);
    reply
      .header("Content-Type", contentType)
      .header("Content-Length", buffer.length.toString())
      .header("X-Voice", meta.voice)
      .header("X-Lang", meta.lang);
    return reply.send(buffer);
  } catch (err) {
    request.log.error({ err }, "tts error");
    return reply.code(502).send({ error: "tts_failed" });
  }
}
