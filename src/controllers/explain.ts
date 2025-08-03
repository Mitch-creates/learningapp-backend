import { FastifyRequest, FastifyReply } from "fastify";
import { processExplanation } from "../services/explanationService";

interface ExplainRequest {
  Body: {
    text: string;
  };
}

/**
 * Handler for the /explain endpoint
 */
export async function explainHandler(
  request: FastifyRequest<ExplainRequest>,
  reply: FastifyReply
) {
  const { text } = request.body;

  if (!text) {
    return reply.status(400).send({ error: "Text is required" });
  }

  try {
    const result = await processExplanation(text);

    return reply.send({
      id: result.id,
      explanation: result.explanation,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({ error: "Failed to get explanation" });
  }
}
