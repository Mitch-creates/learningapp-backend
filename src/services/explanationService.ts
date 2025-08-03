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
  const messages = [
    {
      role: "system",
      content:
        "You explain the marked text («like this») in simple, concise language. 2–3 sentences. No fluff.",
    },
    {
      role: "user",
      content: `Context:\n${markedSnippet}\n\nTask: Explain the marked text («…»).`,
    },
  ];

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that explains things simply.",
      },
      {
        role: "user",
        content: `Explain the following text in a simple and concise way: "${markedSnippet}"`,
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
