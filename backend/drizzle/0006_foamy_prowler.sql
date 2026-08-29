ALTER TYPE "public"."user_status" ADD VALUE 'pending_activation' BEFORE 'active';--> statement-breakpoint
ALTER TYPE "public"."user_status" ADD VALUE 'suspended';--> statement-breakpoint
CREATE TABLE "driver_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"identity_card_number" varchar(64) NOT NULL,
	"vehicle_plate_number" varchar(32) NOT NULL,
	"route_code" varchar(64),
	"vehicle_manufacture_year" integer NOT NULL,
	"start_route" varchar(160) NOT NULL,
	"end_route" varchar(160) NOT NULL,
	"passenger_capacity" integer NOT NULL,
	"registration_document" varchar(512) NOT NULL,
	"operation_permit" varchar(512) NOT NULL,
	"vehicle_photo" varchar(512) NOT NULL,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "driver_details_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "driver_details_identity_card_number_unique" UNIQUE("identity_card_number"),
	CONSTRAINT "driver_details_vehicle_plate_number_unique" UNIQUE("vehicle_plate_number")
);
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "phone" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "driver_details" ADD CONSTRAINT "driver_details_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;