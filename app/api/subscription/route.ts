import { NextResponse } from 'next/server';
import { getTeamForUser } from '@/lib/db/queries';
import { stripe } from '@/lib/payments/stripe';

export async function GET() {
  try {
    const team = await getTeamForUser();

    if (!team || !team.stripeSubscriptionId) {
      return NextResponse.json({ subscription: null });
    }

    const subscription = await stripe.subscriptions.retrieve(team.stripeSubscriptionId);

    // Get the quantity from the first subscription item
    const quantity = subscription.items.data[0]?.quantity || 1;

    return NextResponse.json({
      subscription: {
        quantity,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ subscription: null });
  }
}
