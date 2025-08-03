import OpenAI from "openai";
import { db } from "../db";
import { explanations } from "../db/schema";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate an explanation for the given text using OpenAI
 */
export async function generateExplanation(text: string): Promise<string> {
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
    throw new Error("Failed to get explanation from OpenAI");
  }

  return explanation;
}

/**
 * Save an explanation to the database
 */
export async function saveExplanation(sourceText: string, explanation: string) {
  const [newExplanation] = await db
    .insert(explanations)
    .values({ sourceText, explanation })
    .returning();

  return newExplanation;
}

/**
 * Process text to get explanation - generates and saves in one operation
 */
export async function processExplanation(text: string) {
  const explanation = await generateExplanation(text);
  return saveExplanation(text, explanation);
}
