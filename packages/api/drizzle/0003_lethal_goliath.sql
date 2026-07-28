ALTER TABLE "bookings" ADD COLUMN "guest_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "guest_email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "guests" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "total_price" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "currency" varchar(3) NOT NULL;