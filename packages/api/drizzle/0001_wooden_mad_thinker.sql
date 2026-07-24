CREATE TYPE "public"."amenity" AS ENUM('wifi', 'breakfast_provided', 'washer', 'kitchen', 'pool', 'parking');--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"price" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"max_guests" integer NOT NULL,
	"amenities" "amenity"[] NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"location" geography(Point, 4326) NOT NULL,
	"images" text[] NOT NULL
);
--> statement-breakpoint
CREATE INDEX "listings_location_idx" ON "listings" USING gist ("location");