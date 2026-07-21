CREATE TYPE "coupon_type" AS ENUM('percentage', 'flat');--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(50) NOT NULL,
	"type" "coupon_type" NOT NULL,
	"value" numeric(10,2) NOT NULL,
	"min_purchase" numeric(10,2) DEFAULT '0' NOT NULL,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_value_positive" CHECK ("value" > 0),
	CONSTRAINT "coupons_percentage_range" CHECK ("type" <> 'percentage' OR "value" <= 100),
	CONSTRAINT "coupons_usage_limit_positive" CHECK ("usage_limit" IS NULL OR "usage_limit" > 0),
	CONSTRAINT "coupons_min_purchase_non_negative" CHECK ("min_purchase" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_unique" ON "coupons" (upper("code"));