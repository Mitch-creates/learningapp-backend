import OpenAI from "openai";
import { db } from "../db";
import { explanations } from "../db/schema";
import { ExplanationPayload } from "../constants/apiConstants";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate an explanation for the given text using OpenAI
 */
export async function generateExplanation(
  explanationPayload: ExplanationPayload
): Promise<string> {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that explains things simply.",
      },
      {
        role: "user",
        content: `Explain the following text in a simple and concise way: "${explanationPayload.context}"`,
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
export async function saveExplanation(
  explanationPayload: ExplanationPayload,
  explanation: string
) {
  const [newExplanation] = await db
    .insert(explanations)
    .values({
      selectedText: explanationPayload.selectedText,
      context: explanationPayload.context,
      explanation,
    })
    .returning();

  return newExplanation;
}

/**
 * Process text to get explanation - generates and saves in one operation
 */
export async function processExplanation(
  explanationPayload: ExplanationPayload
) {
  const explanation = await generateExplanation(explanationPayload);
  return saveExplanation(explanationPayload, explanation);
}
