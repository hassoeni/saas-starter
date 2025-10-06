import Stripe from 'stripe';
import { handleSubscriptionChange, stripe } from '@/lib/payments/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { stripeEvents } from '@/lib/db/schema';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    );
  }

  // Log the event to database for idempotency and audit trail
  try {
    await db.insert(stripeEvents).values({
      eventId: event.id,
      eventType: event.type,
      payload: JSON.stringify(event),
      processed: new Date(),
    }).onConflictDoNothing();
  } catch (error) {
    // If event already exists, it's a duplicate - return success
    if (error instanceof Error && error.message.includes('duplicate key')) {
      console.log(`Duplicate webhook event: ${event.id}`);
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  try {
    await handleWebhookEvent(event);
  } catch (error) {
    console.error(`Error processing webhook event ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    // Checkout session completed - link customer to user
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;

    // Subscription lifecycle events
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      break;

    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event.data.object as Stripe.Subscription);
      break;

    // Invoice and payment events
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.finalized':
      console.log('Invoice finalized:', event.data.object.id);
      // Could store invoice for records
      break;

    case 'invoice.upcoming':
      console.log('Upcoming invoice:', event.data.object);
      // Could send notification about upcoming charge
      break;

    // Customer events
    case 'customer.updated':
      console.log('Customer updated:', event.data.object.id);
      // Could sync customer data
      break;

    // Payment method events
    case 'payment_method.attached':
      console.log('Payment method attached:', event.data.object.id);
      break;

    case 'payment_method.detached':
      console.log('Payment method detached:', event.data.object.id);
      // Could warn user they have no payment method
      break;

    // Billing meter events
    case 'billing.meter.error_report_triggered':
      console.error('Meter error:', event.data.object);
      // Could alert about meter issues
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const userId = session.client_reference_id;

  if (!userId) {
    console.error('No client_reference_id in checkout session');
    return;
  }

  const { updateUserSubscription } = await import('@/lib/db/queries');

  // Link Stripe customer to user
  await updateUserSubscription(parseInt(userId), {
    stripeCustomerId: customerId,
    stripeSubscriptionId: null, // Will be set by subscription.created webhook
    stripeProductId: null,
    planType: null,
    subscriptionStatus: 'incomplete'
  });

  console.log(`Linked Stripe customer ${customerId} to user ${userId}`);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log(`Trial will end for subscription: ${subscription.id}`);
  // TODO: Send email notification to customer
  // const customer = await stripe.customers.retrieve(subscription.customer as string);
  // await sendTrialEndingEmail(customer.email, subscription);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Payment succeeded for invoice: ${invoice.id}`);
  // TODO: Send receipt email
  // Could also log successful payment for analytics
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Payment failed for invoice: ${invoice.id}`);
  // TODO: Send dunning email
  // TODO: Suspend access if needed
  // const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  // await handleSubscriptionChange(subscription);
}
