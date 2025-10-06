'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { withTeam } from '@/lib/auth/middleware';
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

export const customerPortalAction = withTeam(async (_, team) => {
  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});
