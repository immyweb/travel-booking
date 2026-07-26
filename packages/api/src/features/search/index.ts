import { SearchQuerySchema, SearchResponseSchema } from '@travel-booking/core';
import { Router } from 'express';
import { validateQuery } from '../../http/validate';
import { getCityCentroids, searchListings } from '../listings';

export const searchRouter = Router();

// Backs the "Where to?" dropdown: curated cities the current listings supply
// spans, each resolved to its centroid so the web page can turn a city pick
// into a lat/lng/radiusKm search server-side (ADR-0002 keeps this in Express).
searchRouter.get('/search/cities', async (_req, res) => {
  const cities = await getCityCentroids();
  res.json({ cities });
});

searchRouter.get(
  '/search',
  validateQuery(SearchQuerySchema, async (query, _req, res) => {
    const { page, size } = query;
    const { results, total } = await searchListings(query);

    // `parse`, not `safeParse` — a response that doesn't match the contract is
    // our bug, so it belongs on the 500 path rather than being reported to the
    // client as if they caused it.
    const response = SearchResponseSchema.parse({
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
      results,
    });

    res.json(response);
  }),
);
