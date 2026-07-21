CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"logo_url" text,
	"website" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug_unique" ON "brands" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_name_lower_unique" ON "brands" (lower("name"));--> statement-breakpoint
CREATE INDEX "brands_active_idx" ON "brands" ("is_active");