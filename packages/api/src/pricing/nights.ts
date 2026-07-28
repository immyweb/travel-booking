const MS_PER_NIGHT = 24 * 60 * 60 * 1000;

// Shared by Listing Detail's availability pricing and Bookings' totalPrice
// calculation — both derive nights from the same inclusive-checkIn/exclusive-
// checkOut range, so a booking's price always matches what Availability
// quoted for the same dates.
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / MS_PER_NIGHT);
}
