import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { Team, User } from '@/lib/db/schema';
import {
  getTeamByStripeCustomerId,
  getUser,
  updateTeamSubscription
} from '@/lib/db/queries';
import { getPlan, type PlanType } from './plans';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil'
});

export async function createCheckoutSession({
  planType,
  priceId,
  quantity = 1
}: {
  planType: PlanType;
  priceId: string;
  quantity?: number;
}) {
  const user = await getUser();

  if (!user) {
    redirect(`/sign-up?redirect=checkout&planType=${planType}&priceId=${priceId}&quantity=${quantity}`);
  }

  const plan = getPlan(planType);
  if (!plan) {
    throw new Error(`Invalid plan type: ${planType}`);
  }

  // Determine if this is a team plan or individual plan
  const isTeamPlan = planType === 'team' || planType === 'enterprise';

  // For team plans, ensure the user has a team
  let team: Team | null = null;
  if (isTeamPlan) {
    const { getTeamForUser } = await import('@/lib/db/queries');
    team = await getTeamForUser();
    if (!team) {
      redirect(`/sign-up?redirect=checkout&planType=${planType}`);
    }
  }

  // Check if the price is metered
  const price = await stripe.prices.retrieve(priceId);
  const isMetered = price.recurring?.usage_type === 'metered';

  const lineItem: any = {
    price: priceId,
  };

  // Only add quantity for non-metered prices
  if (!isMetered) {
    lineItem.quantity = quantity;
  }

  // Determine which customer ID to use
  const customerId = isTeamPlan
    ? team?.stripeCustomerId
    : user.stripeCustomerId;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [lineItem],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/pricing`,
    customer: customerId || undefined,
    client_reference_id: user.id.toString(),
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        planType,
        userId: user.id.toString(),
        teamId: team?.id.toString() || ''
      }
    }
  });

  redirect(session.url!);
}

export async function createCustomerPortalSession(customerIdOrTeam: string | Team) {
  const customerId = typeof customerIdOrTeam === 'string'
    ? customerIdOrTeam
    : customerIdOrTeam.stripeCustomerId;

  if (!customerId) {
    redirect('/pricing');
  }

  // Get all active products and their prices
  const products = await stripe.products.list({
    active: true
  });

  const productConfigs = await Promise.all(
    products.data.map(async (product) => {
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        type: 'recurring'
      });

      // Filter out metered prices (usage-based billing) as they're not supported in customer portal
      const nonMeteredPrices = prices.data.filter(
        (price) => price.recurring?.usage_type !== 'metered'
      );

      return {
        product: product.id,
        prices: nonMeteredPrices.map((price) => price.id)
      };
    })
  );

  // Filter out products with no valid prices
  const validProductConfigs = productConfigs.filter(
    (config) => config.prices.length > 0
  );

  // Create portal configuration
  const configOptions: any = {
    business_profile: {
      headline: 'Manage your subscription'
    },
    features: {
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        cancellation_reason: {
          enabled: true,
          options: [
            'too_expensive',
            'missing_features',
            'switched_service',
            'unused',
            'other'
          ]
        }
      },
      payment_method_update: {
        enabled: true
      },
      invoice_history: {
        enabled: true
      }
    }
  };

  // Only enable subscription update if there are valid products to switch to
  if (validProductConfigs.length > 0) {
    configOptions.features.subscription_update = {
      enabled: true,
      default_allowed_updates: ['price', 'quantity', 'promotion_code'],
      proration_behavior: 'create_prorations',
      products: validProductConfigs
    };
  }

  const configuration = await stripe.billingPortal.configurations.create(configOptions);

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.BASE_URL}/dashboard`,
    configuration: configuration.id
  });
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const metadata = subscription.metadata;

  const { getUserByStripeCustomerId } = await import('@/lib/db/queries');
  const { updateUserSubscription } = await import('@/lib/db/queries');

  // Try to find team or user (with retry for race condition)
  let team = await getTeamByStripeCustomerId(customerId);
  let user = await getUserByStripeCustomerId(customerId);

  // If not found, wait 2 seconds and retry (checkout.session.completed might still be processing)
  if (!team && !user) {
    console.log('⏳ User/team not found, waiting 2s for checkout.session.completed webhook...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    team = await getTeamByStripeCustomerId(customerId);
    user = await getUserByStripeCustomerId(customerId);
  }

  if (!team && !user) {
    console.error('❌ Neither team nor user found for Stripe customer:', customerId);
    console.error('Subscription ID:', subscriptionId);
    console.error('Will retry via Stripe webhook retry mechanism');
    throw new Error('Customer not found - will retry');
  }

  console.log('✅ Found user/team for customer:', customerId, { userId: user?.id, teamId: team?.id });

  // Get the product to determine plan type
  const primaryItem = subscription.items.data[0];
  const productId = primaryItem?.plan.product as string;
  const product = await stripe.products.retrieve(productId);

  console.log('📦 Product info:', { productId, productName: product.name });

  // Map product name to plan type
  let planType = metadata?.planType as string | undefined;
  if (!planType) {
    // Infer plan type from product name
    const productName = product.name;
    if (productName === 'Transformertokens') planType = 'pay_as_you_go';
    else if (productName === 'Pro Unlimited' || productName === 'Plus') planType = 'pro_unlimited';
    else if (productName === 'Team') planType = 'team';
    else if (productName === 'Enterprise') planType = 'enterprise';

    console.log('🔍 Inferred plan type:', planType, 'from product:', productName);
  }

  const isTeamPlan = planType === 'team' || planType === 'enterprise';

  const { db } = await import('@/lib/db/drizzle');
  const { subscriptionItems } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  if (status === 'active' || status === 'trialing') {
    // Get the primary plan (first item)
    const primaryItem = subscription.items.data[0];
    const plan = primaryItem?.plan;
    const productId = plan?.product as string;

    if (isTeamPlan && team) {
      // Update team subscription
      await updateTeamSubscription(team.id, {
        stripeSubscriptionId: subscriptionId,
        stripeProductId: productId,
        planType: planType || null,
        subscriptionStatus: status
      });

      // Store subscription items for team
      await db
        .delete(subscriptionItems)
        .where(eq(subscriptionItems.stripeSubscriptionId, subscriptionId));

      for (const item of subscription.items.data) {
        const product = await stripe.products.retrieve(item.price.product as string);
        const isMetered = item.price.recurring?.usage_type === 'metered';

        await db.insert(subscriptionItems).values({
          teamId: team.id,
          stripeSubscriptionId: subscriptionId,
          stripeSubscriptionItemId: item.id,
          stripeProductId: product.id,
          stripePriceId: item.price.id,
          quantity: item.quantity || null,
          isMetered: isMetered ? 'true' : 'false',
        });
      }
    } else if (user) {
      // Update user subscription
      await updateUserSubscription(user.id, {
        stripeSubscriptionId: subscriptionId,
        stripeProductId: productId,
        planType: planType || null,
        subscriptionStatus: status
      });
    }
  } else if (status === 'canceled' || status === 'unpaid') {
    if (isTeamPlan && team) {
      // Remove subscription items
      await db
        .delete(subscriptionItems)
        .where(eq(subscriptionItems.stripeSubscriptionId, subscriptionId));

      // Update team subscription
      await updateTeamSubscription(team.id, {
        stripeSubscriptionId: null,
        stripeProductId: null,
        planType: null,
        subscriptionStatus: status
      });
    } else if (user) {
      // Update user subscription
      await updateUserSubscription(user.id, {
        stripeSubscriptionId: null,
        stripeProductId: null,
        planType: null,
        subscriptionStatus: status
      });
    }
  }
}

export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days
  }));
}

export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });
  // console.log(Object(products.data));

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id
  }));
}
