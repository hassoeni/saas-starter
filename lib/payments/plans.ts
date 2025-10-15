/**
 * Stripe Plans Configuration
 *
 * This file contains all plan definitions for the application.
 * Plans are automatically configured based on template.config.json
 */

import { loadConfig } from '../template/config';

export type PlanType = 'pay_as_you_go' | 'pro_unlimited' | 'team' | 'enterprise';

export interface PlanConfig {
  id: PlanType;
  name: string;
  description: string;
  stripePriceId: string;
  stripeProductId?: string;
  price: number; // Base price in dollars
  billingPeriod: 'month' | 'usage' | 'custom';
  features: string[];
  tokenLimit: number; // -1 = unlimited, 0 = metered (pay per use)
  isMetered: boolean;
  minSeats?: number;
  maxSeats?: number;
  popular?: boolean;
  enterprise?: boolean;
}

/**
 * Load Stripe Price IDs from template config or env vars
 */
async function loadStripePriceIds() {
  try {
    const config = await loadConfig();
    return {
      PAY_AS_YOU_GO: config.stripe.products.pay_as_you_go?.priceId || process.env.STRIPE_PRICE_PAY_AS_YOU_GO || 'price_pay_as_you_go_REPLACE_ME',
      PRO_UNLIMITED: config.stripe.products.pro_unlimited?.priceId || process.env.STRIPE_PRICE_PRO_UNLIMITED || 'price_pro_unlimited_REPLACE_ME',
      TEAM: config.stripe.products.team?.priceId || process.env.STRIPE_PRICE_TEAM || 'price_team_REPLACE_ME',
      ENTERPRISE: config.stripe.products.enterprise?.priceId || process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_REPLACE_ME',
    };
  } catch {
    // Fallback to env vars
    return {
      PAY_AS_YOU_GO: process.env.STRIPE_PRICE_PAY_AS_YOU_GO || 'price_pay_as_you_go_REPLACE_ME',
      PRO_UNLIMITED: process.env.STRIPE_PRICE_PRO_UNLIMITED || 'price_pro_unlimited_REPLACE_ME',
      TEAM: process.env.STRIPE_PRICE_TEAM || 'price_team_REPLACE_ME',
      ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_REPLACE_ME',
    };
  }
}

/**
 * Stripe Price IDs (sync version for immediate use)
 */
export const STRIPE_PRICE_IDS = {
  PAY_AS_YOU_GO: process.env.STRIPE_PRICE_PAY_AS_YOU_GO || 'price_pay_as_you_go_REPLACE_ME',
  PRO_UNLIMITED: process.env.STRIPE_PRICE_PRO_UNLIMITED || 'price_pro_unlimited_REPLACE_ME',
  TEAM: process.env.STRIPE_PRICE_TEAM || 'price_team_REPLACE_ME',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_REPLACE_ME',
} as const;

/**
 * All available plans
 */
export const PLANS: Record<PlanType, PlanConfig> = {
  pay_as_you_go: {
    id: 'pay_as_you_go',
    name: 'Pay as You Go',
    description: 'Perfect for occasional use. Pay only for what you consume.',
    stripePriceId: STRIPE_PRICE_IDS.PAY_AS_YOU_GO,
    price: 0.50, // Per token
    billingPeriod: 'usage',
    tokenLimit: 0, // 0 means metered (unlimited but charged per use)
    isMetered: true,
    features: [
      'Pay only for what you use',
      'No monthly commitment',
      '$0.50 per token',
      'Basic support',
      'API access',
    ],
  },
  pro_unlimited: {
    id: 'pro_unlimited',
    name: 'Pro Unlimited',
    description: 'Best for power users. Unlimited tokens at a flat monthly rate.',
    stripePriceId: STRIPE_PRICE_IDS.PRO_UNLIMITED,
    price: 29,
    billingPeriod: 'month',
    tokenLimit: -1, // -1 means unlimited
    isMetered: false,
    popular: true,
    features: [
      'Unlimited tokens',
      'All premium features',
      'Advanced analytics',
      'Priority support',
      'API access',
      'Export capabilities',
    ],
  },
  team: {
    id: 'team',
    name: 'Team',
    description: 'Collaborate with your team. Unlimited tokens per seat.',
    stripePriceId: STRIPE_PRICE_IDS.TEAM,
    price: 19, // Per seat
    billingPeriod: 'month',
    tokenLimit: -1, // Unlimited per seat
    isMetered: false,
    minSeats: 2,
    maxSeats: 50,
    features: [
      'Everything in Pro',
      'Unlimited tokens per seat',
      'Shared workspace',
      'Team collaboration',
      'Admin controls',
      'Usage analytics per member',
      'Priority support',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations.',
    stripePriceId: STRIPE_PRICE_IDS.ENTERPRISE,
    price: 0, // Custom pricing
    billingPeriod: 'custom',
    tokenLimit: -1,
    isMetered: false,
    enterprise: true,
    features: [
      'Everything in Team',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'Advanced security',
      'Custom contracts',
      'Volume discounts',
      'On-premise options',
    ],
  },
};

/**
 * Get plan configuration by ID
 */
export function getPlan(planId: PlanType | null): PlanConfig | null {
  if (!planId) return null;
  return PLANS[planId] || null;
}

/**
 * Check if a plan has unlimited tokens
 */
export function hasUnlimitedTokens(planId: PlanType | null): boolean {
  const plan = getPlan(planId);
  return plan?.tokenLimit === -1;
}

/**
 * Check if a plan is metered (pay per use)
 */
export function isMeteredPlan(planId: PlanType | null): boolean {
  const plan = getPlan(planId);
  return plan?.isMetered || false;
}

/**
 * Get all plans for display on pricing page
 * Filters based on template configuration
 */
export async function getAllPlans(): Promise<PlanConfig[]> {
  try {
    const config = await loadConfig();
    const enabledPlanIds = [...config.plans.individual, ...config.plans.team];
    return Object.values(PLANS).filter(plan => enabledPlanIds.includes(plan.id));
  } catch {
    // Fallback to all plans if no config
    return Object.values(PLANS);
  }
}

/**
 * Get individual plans (non-team, non-enterprise)
 * Filters based on template configuration
 */
export async function getIndividualPlans(): Promise<PlanConfig[]> {
  try {
    const config = await loadConfig();
    return config.plans.individual.map(id => PLANS[id as PlanType]).filter(Boolean);
  } catch {
    return [PLANS.pay_as_you_go, PLANS.pro_unlimited];
  }
}

/**
 * Get team plans
 * Filters based on template configuration
 */
export async function getTeamPlans(): Promise<PlanConfig[]> {
  try {
    const config = await loadConfig();
    return config.plans.team.map(id => PLANS[id as PlanType]).filter(Boolean);
  } catch {
    return [PLANS.team, PLANS.enterprise];
  }
}

/**
 * Sync versions (for immediate use, returns all plans)
 */
export function getAllPlansSync(): PlanConfig[] {
  return Object.values(PLANS);
}

export function getIndividualPlansSync(): PlanConfig[] {
  return [PLANS.pay_as_you_go, PLANS.pro_unlimited];
}

export function getTeamPlansSync(): PlanConfig[] {
  return [PLANS.team, PLANS.enterprise];
}
