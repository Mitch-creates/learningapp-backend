import "dotenv/config";
import Fastify from "fastify";
import { db } from "./db";
import { explanations } from "./db/schema";
import OpenAI from "openai";

const fastify = Fastify({
  logger: true,
});

fastify.addHook("onRequest", (req, _reply, done) => {
  req.log.info({ ip: req.ip, url: req.url, method: req.method }, "incoming");
  done();
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

fastify.get("/health", async () => ({ ok: true }));

fastify.post("/explain", async (request, reply) => {
  const { text } = request.body as { text: string };

  if (!text) {
    return reply.status(400).send({ error: "Text is required" });
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that explains things simply.",
        },
        {
          role: "user",
          content: `Explain the following text in a simple and concise way: "${text}"`,
        },
      ],
      model: "gpt-3.5-turbo",
    });

    const explanation = completion.choices[0]?.message?.content;

    if (!explanation) {
      return reply
        .status(500)
        .send({ error: "Failed to get explanation from OpenAI" });
    }

    // Save to database
    const [newExplanation] = await db
      .insert(explanations)
      .values({ sourceText: text, explanation })
      .returning();

    return reply.send({
      id: newExplanation.id,
      explanation,
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Failed to get explanation" });
  }
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
