CREATE TYPE "public"."route_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(160) NOT NULL,
	"origin" varchar(160) NOT NULL,
	"destination" varchar(160) NOT NULL,
	"fare" varchar(32) NOT NULL,
	"operating_hours" varchar(64) NOT NULL,
	"color" varchar(16) DEFAULT '#123d8d' NOT NULL,
	"max_capacity" integer NOT NULL,
	"stops" jsonb NOT NULL,
	"path" jsonb NOT NULL,
	"status" "route_status" DEFAULT 'pending' NOT NULL,
	"submitted_by" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "routes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;