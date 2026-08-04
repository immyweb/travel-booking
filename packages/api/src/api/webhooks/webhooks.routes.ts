import express, { Router } from 'express';
import type Stripe from 'stripe';
import { ApiError } from '../../errors/errors';
import type { StripeWebhookDependencies } from './webhooks.service';
import { handlePaymentIntentSucceeded } from './webhooks.service';

export function createWebhooksRouter(deps: StripeWebhookDependencies): Router {
  const webhooksRouter = Router();

  webhooksRouter.post(
    '/webhooks/stripe',
    // Stripe's signature check needs the exact bytes it signed. Must be
    // mounted ahead of the app's global express.json() (app.ts) — same
    // ordering concern as Better Auth's toNodeHandler(auth) mount there:
    // once a body parser has consumed and reserialized the request, the raw
    // bytes Stripe signed are gone.
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      let event: Stripe.Event;
      try {
        event = await deps.paymentProvider.verifyWebhookSignature(
          req.body as Buffer,
          req.header('stripe-signature') ?? '',
        );
      } catch (err) {
        // Invalid/missing signature: reject without ever reaching a Booking
        // row. Same ApiError path every other route uses — Stripe only acts
        // on the status code, not the envelope shape.
        deps.logger.warn(err, 'Rejected Stripe webhook: signature verification failed');
        throw new ApiError(400, 'Invalid Stripe webhook signature');
      }

      // Every other event type is acknowledged and ignored — Stripe retries
      // (and eventually disables) an endpoint that doesn't 200 its deliveries,
      // regardless of whether the type is one this handler cares about.
      if (event.type === 'payment_intent.succeeded') {
        await handlePaymentIntentSucceeded(deps, event.data.object);
      }

      res.sendStatus(200);
    },
  );

  return webhooksRouter;
}
