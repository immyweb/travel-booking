CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed');--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "status" "booking_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "card_last4" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;