import { http, HttpResponse } from 'msw';
import {
  FIXTURE_BOOKING,
  FIXTURE_CITIES,
  FIXTURE_CREATE_BOOKING_RESPONSE,
  FIXTURE_LISTING,
  FIXTURE_SEARCH_RESPONSE,
  FIXTURE_SESSION_USER,
} from './fixtures';

// Matches lib/api.ts's own default — no API_URL env var is set for web tests.
const API_URL = 'http://localhost:4000';

// The happy path for every lib/api.ts endpoint, registered as setupServer's
// initial handlers (see src/mocks/server.ts). Individual tests override with
// server.use() for error responses, empty states, or scenario-specific data
// — see docs/adr/0009-msw-as-frontend-network-mocking-boundary.md.
export const handlers = [
  http.get(`${API_URL}/search/cities`, () => HttpResponse.json({ cities: FIXTURE_CITIES })),

  http.get(`${API_URL}/search`, () => HttpResponse.json(FIXTURE_SEARCH_RESPONSE)),

  http.get(`${API_URL}/listings/:id`, () => HttpResponse.json(FIXTURE_LISTING)),

  http.post(`${API_URL}/bookings`, () =>
    HttpResponse.json(FIXTURE_CREATE_BOOKING_RESPONSE, { status: 201 }),
  ),

  http.get(`${API_URL}/bookings/mine`, () => HttpResponse.json([])),

  http.get(`${API_URL}/bookings/:id`, () => HttpResponse.json(FIXTURE_BOOKING)),

  http.post(`${API_URL}/api/auth/sign-up/email`, () =>
    HttpResponse.json({ user: { id: FIXTURE_SESSION_USER.id } }),
  ),

  http.post(`${API_URL}/api/auth/sign-in/email`, () =>
    HttpResponse.json({ user: { id: FIXTURE_SESSION_USER.id } }),
  ),

  http.post(`${API_URL}/api/auth/sign-out`, () => HttpResponse.json({ success: true })),

  http.get(`${API_URL}/api/auth/get-session`, () =>
    HttpResponse.json({ session: { id: 'session-1' }, user: FIXTURE_SESSION_USER }),
  ),
];
