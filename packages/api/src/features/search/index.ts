import { SearchQuerySchema, SearchResponseSchema } from '@travel-booking/core';
import { Router } from 'express';
import { getCityCentroids, searchListings } from '../listings';

export const searchRouter = Router();

// Backs the "Where to?" dropdown: curated cities the current listings supply
// spans, each resolved to its centroid so the web page can turn a city pick
// into a lat/lng/radiusKm search server-side (ADR-0002 keeps this in Express).
searchRouter.get('/search/cities', async (_req, res) => {
  const cities = await getCityCentroids();
  res.json({ cities });
});

searchRouter.get('/search', async (req, res) => {
  const parsed = SearchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { page, size } = parsed.data;
  const { results, total } = await searchListings(parsed.data);

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
});
