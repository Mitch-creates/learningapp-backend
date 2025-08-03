import "dotenv/config";
import Fastify from "fastify";
import { db } from "./db";
import { explanations } from "./db/schema";
import OpenAI from "openai";
import { explainHandler } from "./controllers";

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

fastify.post("/explain", explainHandler);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
