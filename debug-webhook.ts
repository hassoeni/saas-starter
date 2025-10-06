import { db } from './lib/db/drizzle';
import { stripeEvents, users } from './lib/db/schema';
import { desc } from 'drizzle-orm';

async function debugWebhook() {
  console.log('\n=== Recent Stripe Webhook Events ===');
  const events = await db
    .select()
    .from(stripeEvents)
    .orderBy(desc(stripeEvents.processed))
    .limit(10);

  console.log(`Found ${events.length} webhook events:\n`);
  for (const event of events) {
    console.log(`Event ID: ${event.eventId}`);
    console.log(`Type: ${event.eventType}`);
    console.log(`Processed: ${event.processed}`);
    console.log(`---`);
  }

  console.log('\n=== All Users ===');
  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Stripe Customer: ${user.stripeCustomerId || 'NULL'}`);
    console.log(`Stripe Subscription: ${user.stripeSubscriptionId || 'NULL'}`);
    console.log(`Plan Type: ${user.planType || 'NULL'}`);
    console.log(`Status: ${user.subscriptionStatus || 'NULL'}`);
    console.log(`---`);
  }

  process.exit(0);
}

debugWebhook();
