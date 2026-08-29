CREATE TYPE "public"."user_role" AS ENUM('admin', 'driver', 'passenger');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(120),
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'passenger' NOT NULL,
	"email_verified_at" timestamp,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"remember_token" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
