ALTER TABLE "explanations" RENAME COLUMN "source_text" TO "selected_text";--> statement-breakpoint
ALTER TABLE "explanations" ADD COLUMN "full_text" text NOT NULL;