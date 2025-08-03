import { FastifyRequest, FastifyReply } from "fastify";
import { processExplanation } from "../services/explanationService";
import { ExplanationPayload } from "../constants/apiConstants";

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
