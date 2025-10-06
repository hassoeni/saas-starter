'use server';

import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { stripe } from './stripe';
import { type PlanType } from './plans';

/**
 * Switch between plans for existing subscription
 */
export async function switchSubscriptionPlan(
  newPlanType: PlanType,
  newPriceId: string
) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const isTeamPlan = newPlanType === 'team' || newPlanType === 'enterprise';
  const hasUserSubscription = !!user.stripeSubscriptionId;

  // If switching from individual to team plan, need to cancel individual subscription first
  if (isTeamPlan && hasUserSubscription) {
    try {
      // Check if subscription still exists before canceling
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      if (subscription.status !== 'canceled') {
        // Cancel the current individual subscription
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      }
    } catch (error: any) {
      // Subscription doesn't exist or already cancelled, that's fine
      if (error.code !== 'resource_missing') {
        throw error;
      }
    }

    // Redirect to checkout for new team subscription
    redirect(`/pricing?plan=${newPlanType}&message=switching_to_team`);
  }

  // Check if user has an active subscription
  if (!user.stripeSubscriptionId) {
    // No subscription exists, redirect to checkout for new subscription
    redirect(`/pricing`);
  }

  try {
    // Get the current subscription
    const currentSubscription = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId
    );

    // Get the subscription item ID (first item)
    const subscriptionItemId = currentSubscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      throw new Error('No subscription items found');
    }

    // Check if switching from metered to non-metered or vice versa
    const currentPrice = await stripe.prices.retrieve(
      currentSubscription.items.data[0].price.id
    );
    const newPrice = await stripe.prices.retrieve(newPriceId);

    const currentIsMetered = currentPrice.recurring?.usage_type === 'metered';
    const newIsMetered = newPrice.recurring?.usage_type === 'metered';

    // If switching between metered/non-metered, need to cancel old and create new
    if (currentIsMetered !== newIsMetered) {
      // Cancel the current subscription at period end
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      // Redirect to checkout for new subscription
      redirect(`/pricing?plan=${newPlanType}&message=switching`);
    }

    // Update the subscription with the new price
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: newPriceId
        }
      ],
      proration_behavior: 'create_prorations', // Pro-rate the change
      metadata: {
        planType: newPlanType,
        userId: user.id.toString()
      }
    });

    // Redirect back to dashboard
    redirect('/dashboard?message=plan_updated');
  } catch (error) {
    console.error('Error switching subscription:', error);
    throw error;
  }
}

/**
 * Cancel user's subscription
 */
export async function cancelSubscription() {
  const user = await getUser();

  if (!user || !user.stripeSubscriptionId) {
    redirect('/pricing');
  }

  try {
    // Cancel at period end to let user finish their paid period
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    redirect('/dashboard?message=subscription_cancelled');
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}

/**
 * Clean up duplicate subscriptions for a customer
 */
export async function cleanupDuplicateSubscriptions(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all'
  });

  const activeSubscriptions = subscriptions.data.filter(
    (sub) => sub.status === 'active' || sub.status === 'trialing'
  );

  if (activeSubscriptions.length <= 1) {
    return; // No duplicates
  }

  // Keep the most recent subscription, cancel the rest
  const sortedByCreated = activeSubscriptions.sort((a, b) => b.created - a.created);
  const toKeep = sortedByCreated[0];
  const toCancel = sortedByCreated.slice(1);

  console.log(`Found ${toCancel.length} duplicate subscriptions for customer ${customerId}`);

  for (const sub of toCancel) {
    console.log(`Cancelling duplicate subscription: ${sub.id}`);
    await stripe.subscriptions.cancel(sub.id);
  }

  return toKeep;
}
