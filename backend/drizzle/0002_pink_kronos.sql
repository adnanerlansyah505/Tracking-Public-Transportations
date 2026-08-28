CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_token_hash" varchar(60);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_token_hash_at" timestamp;