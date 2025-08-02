import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const explanations = pgTable('explanations', {
  id: serial('id').primaryKey(),
  sourceText: text('source_text').notNull(),
  explanation: text('explanation').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
