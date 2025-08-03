import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const explanations = pgTable("explanations", {
  id: serial("id").primaryKey(),
  selectedText: text("selected_text").notNull(),
  fullText: text("full_text").notNull(),
  explanation: text("explanation").notNull(),
  // targetLanguage: text("target_language").notNull(),
  // sourceLanguage: text("source_language").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
