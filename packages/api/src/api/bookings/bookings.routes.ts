import { BookingSchema, CreateBookingSchema } from '@travel-booking/core';
import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../errors/errors';
import { validateBody, validateParams } from '../../errors/validate';
import type { CreateBookingDependencies } from './bookings.service';
import { createBooking, getBookingById } from './bookings.service';

// Malformed (non-UUID) ids are a client mistake (400); well-formed ids that
// match no row are a missing resource (404) — same convention as
// GET /listings/:id's ListingParamsSchema.
const BookingParamsSchema = z.object({ id: z.uuid() });

export function createBookingsRouter(deps: CreateBookingDependencies): Router {
  const bookingsRouter = Router();

  bookingsRouter.post(
    '/bookings',
    validateBody(CreateBookingSchema, async (body, _req, res) => {
      const booking = await createBooking(deps, body);

      // `parse`, not `safeParse` — a response that doesn't match the contract
      // is our bug, so it belongs on the 500 path rather than being reported
      // to the client as if they caused it.
      res.status(201).json(BookingSchema.parse(booking));
    }),
  );

  bookingsRouter.get(
    '/bookings/:id',
    validateParams(BookingParamsSchema, async ({ id }, _req, res) => {
      const booking = await getBookingById(deps.db, id);
      if (!booking) {
        throw new ApiError(404, 'Booking not found');
      }

      res.json(BookingSchema.parse(booking));
    }),
  );

  return bookingsRouter;
}
