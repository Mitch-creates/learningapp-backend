CREATE TABLE IF NOT EXISTS "explanations" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_text" text NOT NULL,
	"explanation" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
