'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { getUser } from '@/lib/db/queries';
import { type PlanType } from './plans';

export async function checkoutAction(formData: FormData) {
  const priceId = formData.get('priceId') as string;
  const planType = formData.get('planType') as PlanType;
  const quantity = formData.get('quantity');
  const quantityNumber = quantity ? parseInt(quantity as string) : 1;

  await createCheckoutSession({
    planType,
    priceId,
    quantity: quantityNumber
  });
}

export async function customerPortalAction() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Check if user has a Stripe customer ID (for individual plans)
  const customerId = user.stripeCustomerId;

  if (!customerId) {
    redirect('/pricing');
  }

  const portalSession = await createCustomerPortalSession(customerId);
  redirect(portalSession.url);
}
