import type {
  Booking,
  CityCentroid,
  ListingDetail,
  SearchResponse,
  SessionUser,
} from '@travel-booking/core';

// Canonical happy-path fixtures for the api's MSW handlers. Tests import
// these directly — for the same object to serve as both the mocked response
// and the expected value, it must be a single shared source of truth rather
// than redeclared per file.

export const FIXTURE_LISTING: ListingDetail = {
  id: 'listing-1',
  title: 'Sunny Alfama studio',
  images: [
    'https://images.travel-booking.example/1.jpg',
    'https://images.travel-booking.example/2.jpg',
  ],
  price: 82,
  currency: 'EUR',
  maxGuests: 4,
  amenities: ['wifi', 'parking'],
  city: 'Lisbon',
  country: 'Portugal',
  coordinates: { latitude: 38.7127, longitude: -9.1288 },
  availability: null,
};

export const FIXTURE_BOOKING: Booking = {
  id: 'booking-1',
  listingId: FIXTURE_LISTING.id,
  userId: 'user-1',
  checkIn: '2026-08-05',
  checkOut: '2026-08-10',
  guests: 2,
  guestName: 'Jane Doe',
  guestEmail: 'jane@example.com',
  nights: 5,
  totalPrice: 410,
  currency: 'EUR',
};

export const FIXTURE_SESSION_USER: SessionUser = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
};

export const FIXTURE_CITIES: CityCentroid[] = [
  { city: 'Lisbon', country: 'Portugal', coordinates: { latitude: 38.7169, longitude: -9.1399 } },
  { city: 'Paris', country: 'France', coordinates: { latitude: 48.8566, longitude: 2.3522 } },
];

export const FIXTURE_SEARCH_RESPONSE: SearchResponse = {
  pagination: { page: 1, size: 12, total: 2, totalPages: 1 },
  results: [
    {
      id: 'listing-1',
      title: 'Sunny Alfama studio',
      images: ['https://images.travel-booking.example/1.jpg'],
      price: 82,
      currency: 'EUR',
      coordinates: { latitude: 38.7127, longitude: -9.1288 },
      distanceKm: 1.2,
    },
    {
      id: 'listing-2',
      title: 'Belém riverside loft',
      images: ['https://images.travel-booking.example/2.jpg'],
      price: 118,
      currency: 'EUR',
      coordinates: { latitude: 38.6971, longitude: -9.2033 },
      distanceKm: 3.4,
    },
  ],
};
