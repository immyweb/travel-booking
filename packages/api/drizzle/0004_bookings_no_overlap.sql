-- Custom SQL migration file, put your code below! --
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Check-in inclusive, check-out exclusive — matches bookingOverlapsRange's
-- application-level rule, so the database rejects exactly the same overlaps
-- the API already treats as unavailable. Scoped per listing_id via the `=`
-- operator (available on a gist index only because of btree_gist above).
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlapping_dates" EXCLUDE USING gist (
	listing_id WITH =,
	daterange(check_in, check_out, '[)') WITH &&
);
