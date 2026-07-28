// Shared by the client form's pre-submit check and the Server Action's own
// re-validation (see BookingForm.tsx and _actions.ts) so the FormData ->
// CreateBookingSchema input shape is defined in exactly one place.
export function bookingFieldsFromFormData(formData: FormData) {
  return {
    listingId: formData.get('listingId'),
    checkIn: formData.get('checkIn'),
    checkOut: formData.get('checkOut'),
    guests: Number(formData.get('guests')),
    guestName: formData.get('guestName'),
    guestEmail: formData.get('guestEmail'),
  };
}
