import { ListingDetailSchema } from '@travel-booking/core';
import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../../db/db';
import { ApiError } from '../../errors/errors';
import { validateParams } from '../../errors/validate';
import { getListingById } from './listings.service';

// Malformed (non-UUID) ids are a client mistake (400); well-formed ids that
// match no row are a missing resource (404) — validateParams only owns the
// first distinction.
const ListingParamsSchema = z.object({ id: z.uuid() });

export function createListingsRouter(db: Db): Router {
  const listingsRouter = Router();

  listingsRouter.get(
    '/listings/:id',
    validateParams(ListingParamsSchema, async ({ id }, _req, res) => {
      const listing = await getListingById(db, id);
      if (!listing) {
        throw new ApiError(404, 'Listing not found');
      }

      // `parse`, not `safeParse` — a response that doesn't match the contract
      // is our bug, so it belongs on the 500 path rather than being reported
      // to the client as if they caused it.
      res.json(ListingDetailSchema.parse(listing));
    }),
  );

  return listingsRouter;
}
