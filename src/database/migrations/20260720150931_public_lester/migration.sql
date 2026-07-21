CREATE TYPE "product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"description" text,
	"sku" varchar(64) NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"discount_percentage" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"weight_kg" numeric(8,3),
	"dimensions_cm" jsonb,
	"specifications" jsonb DEFAULT '{}' NOT NULL,
	"category_id" uuid NOT NULL,
	"brand_id" uuid,
	"status" "product_status" DEFAULT 'draft'::"product_status" NOT NULL,
	"search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))) STORED NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_non_negative" CHECK ("price" >= 0),
	CONSTRAINT "products_stock_non_negative" CHECK ("stock" >= 0),
	CONSTRAINT "products_discount_percentage_range" CHECK ("discount_percentage" IS NULL OR ("discount_percentage" > 0 AND "discount_percentage" <= 100))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_unique" ON "products" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_unique" ON "products" ("sku");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" ("category_id");--> statement-breakpoint
CREATE INDEX "products_brand_id_idx" ON "products" ("brand_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" ("status");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "products" ("price");--> statement-breakpoint
CREATE INDEX "products_search_vector_idx" ON "products" USING gin ("search_vector");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL;