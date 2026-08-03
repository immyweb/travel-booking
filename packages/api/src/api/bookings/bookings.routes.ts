import { BookingSchema, CreateBookingSchema } from '@travel-booking/core';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../errors/errors';
import { validateBody, validateParams } from '../../errors/validate';
import type { CreateBookingDependencies } from './bookings.service';
import { createBooking, getBookingById, getBookingsForUser } from './bookings.service';

// Malformed (non-UUID) ids are a client mistake (400); well-formed ids that
// match no row are a missing resource (404) — same convention as
// GET /listings/:id's ListingParamsSchema.
const BookingParamsSchema = z.object({ id: z.uuid() });

// In-process call to Better Auth's own session logic — not an HTTP round
// trip — so it needs no Origin/trustedOrigins handling the way a real
// cross-origin request would. Shared by both routes below that require a
// signed-in customer.
async function requireSessionUserId(
  deps: CreateBookingDependencies,
  req: Request,
  message: string,
): Promise<string> {
  const session = await deps.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    throw new ApiError(401, message);
  }

  return session.user.id;
}

export function createBookingsRouter(deps: CreateBookingDependencies): Router {
  const bookingsRouter = Router();

  bookingsRouter.post(
    '/bookings',
    // userId is never client-supplied (ADR-0001's "never client-supplied"
    // treatment of price/currency, applied here to the account behind the
    // booking): it's merged into the body from the session before
    // CreateBookingSchema ever sees it.
    async (req, _res, next) => {
      req.body = {
        ...req.body,
        userId: await requireSessionUserId(deps, req, 'Sign in required to create a booking'),
      };
      next();
    },
    validateBody(CreateBookingSchema, async (body, _req, res) => {
      const booking = await createBooking(deps, body);

      // `parse`, not `safeParse` — a response that doesn't match the contract
      // is our bug, so it belongs on the 500 path rather than being reported
      // to the client as if they caused it.
      res.status(201).json(BookingSchema.parse(booking));
    }),
  );

  // Registered before /bookings/:id: Express matches routes in registration
  // order, and BookingParamsSchema's z.uuid() would otherwise 400 this path
  // first — 'mine' isn't a valid UUID.
  bookingsRouter.get('/bookings/mine', async (req, res) => {
    const userId = await requireSessionUserId(deps, req, 'Sign in required to view your bookings');
    const userBookings = await getBookingsForUser(deps.db, userId);
    res.json(z.array(BookingSchema).parse(userBookings));
  });

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
