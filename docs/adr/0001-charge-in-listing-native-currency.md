# Charge in the Listing's native currency; no display conversion for v1

Listings store a fixed `price` and `currency` (the host's currency). A Booking's `totalPrice` is captured in that same currency at time of booking — the platform never charges a user in a currency other than the listing's, avoiding FX risk and rounding disputes on refunds. For v1, no display-time currency conversion is offered either: prices are shown as-is with a clear currency symbol/code, and converting to the viewer's local currency for display is deferred as a fast-follow rather than launch scope.
