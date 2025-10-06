import { NextResponse } from 'next/server';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { stripe } from '@/lib/payments/stripe';

export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ subscription: null }, { status: 401 });
    }

    // Check user subscription first (for individual plans)
    if (user.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const quantity = subscription.items.data[0]?.quantity || 1;

      return NextResponse.json({
        subscription: {
          quantity,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          planType: user.planType,
          subscriptionType: 'user'
        }
      });
    }

    // Check team subscription (for team plans)
    const team = await getTeamForUser();
    if (team?.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(team.stripeSubscriptionId);
      const quantity = subscription.items.data[0]?.quantity || 1;

      return NextResponse.json({
        subscription: {
          quantity,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          planType: team.planType,
          subscriptionType: 'team'
        }
      });
    }

    return NextResponse.json({ subscription: null });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ subscription: null });
  }
}
