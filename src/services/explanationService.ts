import OpenAI from "openai";
import { db } from "../db";
import { explanations } from "../db/schema";
import { ExplanationPayload } from "../constants/apiConstants";
import { getContextSnippet } from "../utils/textProcessing";

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
  const { selectedText, fullText, startSelection, endSelection } =
    explanationPayload;
  // Create a new span object to use in our function call
  const span = {
    start_utf16: startSelection,
    end_utf16: endSelection,
    text: selectedText,
  };
  const { snippet, markedSnippet } = getContextSnippet(fullText, span, 400);

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are a precise explainer. Explain only the text between «» using the surrounding context to disambiguate. Respond in English. Output 1–3 short sentences (≤60 words total). Be clear and concrete. Do not repeat the quoted text, do not add headings, lists, examples, or prefaces.",
      },
      {
        role: "user",
        content: `Context with selection marked:\n\n${markedSnippet}`,
      },
    ],
    model: "gpt-4o-mini",
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
      fullText: explanationPayload.fullText,
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
