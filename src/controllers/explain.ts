import { FastifyRequest, FastifyReply } from "fastify";
import { processExplanation } from "../services/explanationService";
import { ExplanationPayload } from "../constants/apiConstants";
import {
  autonymFromIso1,
  detectLanguageFranc,
  detectLanguageHeuristic,
  stripMarkers,
} from "../utils/textProcessing";

interface ExplainRequest {
  Body: ExplanationPayload;
}

/**
 * Handler for the /explain endpoint
 */
export async function explainHandler(
  request: FastifyRequest<ExplainRequest>,
  reply: FastifyReply
) {
  const explanationPayload: ExplanationPayload = request.body;

  if (!explanationPayload.selectedText) {
    return reply.status(400).send({ error: "Text is required" });
  }

  try {
    const result = await processExplanation(explanationPayload);

    return reply.send({
      id: result.id,
      explanation: result.explanation,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to get explanation" });
  }
}

type LanguagePayload = {
  text: string;
  prefer?: "auto" | "heuristic" | "franc";
  minLength?: number; // default 20
  debug?: boolean; // include debug info in response
};

export async function languageHandler(
  request: FastifyRequest<{ Body: LanguagePayload }>,
  reply: FastifyReply
) {
  const {
    text,
    prefer = "franc",
    minLength = 20,
    debug = false,
  } = request.body || {};

  if (!text || typeof text !== "string" || !text.trim()) {
    return reply.status(400).send({ error: "Text is required" });
  }

  // Normalize & trim; remove markers if present; cap size
  const SAMPLE_LIMIT = 5000;
  const clean = stripMarkers(text.normalize("NFC"))
    .trim()
    .slice(0, SAMPLE_LIMIT);

  // Run both detectors so we can compare / fall back
  const heuristicGuess = detectLanguageHeuristic(clean);
  const francGuess =
    clean.length >= minLength
      ? detectLanguageFranc(clean)
      : { lang: "und", confidence: 0, method: "franc" as const };

  const useFranc = prefer === "franc";

  // Primary guess based on preference/length
  let guess = useFranc ? francGuess : heuristicGuess;

  // Fallback if primary undecided
  if (guess.lang === "und") {
    guess = useFranc ? heuristicGuess : francGuess;
  }

  request.log.info(
    {
      len: clean.length,
      prefer,
      minLength,
      useFranc,
      heuristicGuess,
      francGuess,
      chosen: guess,
    },
    "language detection decision"
  );

  const autonym = guess.lang !== "und" ? autonymFromIso1(guess.lang) : null;

  return reply.send({
    lang: guess.lang,
    autonym,
    confidence: guess.confidence,
    method: guess.method,
    ...(debug
      ? {
          debug: {
            inputLength: clean.length,
            prefer,
            minLength,
            useFranc,
            heuristicGuess,
            francGuess,
          },
        }
      : {}),
  });
}
