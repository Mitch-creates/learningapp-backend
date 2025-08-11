import { FastifyReply, FastifyRequest } from "fastify";
import { TranslationPayload } from "../constants/apiConstants";
import { processTranslation } from "../services/translateService";

interface TranslateRequest {
  Body: TranslationPayload;
}

export async function translateHandler(
  request: FastifyRequest<TranslateRequest>,
  reply: FastifyReply
) {
  const payload = request.body;

  if (!payload?.text || !payload?.targetLanguage) {
    return reply
      .code(400)
      .send({ error: "text and targetLanguage are required" });
  }

  try {
    const { translated, detectedSource } = await processTranslation(payload);
    return reply.send({
      from: detectedSource || payload.sourceLanguage || "auto",
      to: payload.targetLanguage,
      text: payload.text,
      translated,
    });
  } catch (err) {
    request.log.error({ err }, "translator error");
    return reply.code(502).send({ error: "translator_failed" });
  }
}
