/**
 * Product Feature Mapping Configuration
 *
 * Integrated with plans.ts for the hybrid pricing model
 */

import { getPlan, hasUnlimitedTokens, isMeteredPlan, type PlanType } from './plans';

export interface ProductFeatures {
  tokenLimit: number; // -1 = unlimited, 0 = metered (pay per use), >0 = fixed limit
  features: string[];
  displayName: string;
  description: string;
  isMetered: boolean;
}

/**
 * Legacy mapping for backward compatibility
 * Maps old plan names to new plan types
 */
const LEGACY_PLAN_MAPPING: Record<string, PlanType> = {
  'Transformertokens': 'pay_as_you_go',
  'TransformerTokens': 'pay_as_you_go',
  'transformertokens': 'pay_as_you_go',
};

/**
 * Get features for a given plan type or legacy plan name
 */
export function getProductFeatures(planIdentifier: string | null): ProductFeatures | null {
  if (!planIdentifier) return null;

  // Check if it's a legacy plan name
  const planType = (LEGACY_PLAN_MAPPING[planIdentifier] || planIdentifier) as PlanType;

  const plan = getPlan(planType);
  if (!plan) return null;

  return {
    tokenLimit: plan.tokenLimit,
    features: plan.features,
    displayName: plan.name,
    description: plan.description,
    isMetered: plan.isMetered,
  };
}

/**
 * Check if a plan includes a specific feature
 */
export function hasFeature(planIdentifier: string | null, feature: string): boolean {
  const productFeatures = getProductFeatures(planIdentifier);
  if (!productFeatures) return false;
  return productFeatures.features.includes(feature);
}

/**
 * Get token limit for a plan
 */
export function getTokenLimit(planIdentifier: string | null): number {
  const productFeatures = getProductFeatures(planIdentifier);
  if (!productFeatures) return 0;
  return productFeatures.tokenLimit;
}

/**
 * Check if plan has unlimited tokens
 */
export function hasUnlimitedTokensForPlan(planIdentifier: string | null): boolean {
  const limit = getTokenLimit(planIdentifier);
  return limit === -1;
}

/**
 * Check if plan is metered (pay per use)
 */
export function isMeteredPlanType(planIdentifier: string | null): boolean {
  const productFeatures = getProductFeatures(planIdentifier);
  return productFeatures?.isMetered || false;
}

/**
 * Get all available features across all plans
 */
export function getAllFeatures(): string[] {
  const { getAllPlans } = require('./plans');
  const allFeatures = new Set<string>();
  getAllPlans().forEach((plan: any) => {
    plan.features.forEach((feature: string) => allFeatures.add(feature));
  });
  return Array.from(allFeatures);
}

/**
 * Feature descriptions for display in UI
 */
export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  'Pay only for what you use': 'No monthly commitment, charged per token',
  'No monthly commitment': 'Cancel anytime, no long-term contracts',
  '$0.50 per token': 'Simple, transparent pricing',
  'Basic support': 'Email support (48h response)',
  'API access': 'Full REST API access',
  'Unlimited tokens': 'No usage limits or metering',
  'All premium features': 'Access to all platform features',
  'Advanced analytics': 'Detailed usage and performance analytics',
  'Priority support': 'Priority email support (24h response)',
  'Export capabilities': 'Export your data anytime',
  'Everything in Pro': 'All features from Pro plan',
  'Shared workspace': 'Collaborate with your team in shared spaces',
  'Team collaboration': 'Real-time collaboration tools',
  'Admin controls': 'Manage team members and permissions',
  'Usage analytics per member': 'Track individual team member usage',
  'Everything in Team': 'All features from Team plan',
  'Custom integrations': 'Build custom integrations with our API',
  'Dedicated account manager': 'Personal support from our team',
  'SLA guarantee': '99.9% uptime guarantee',
  'Advanced security': 'SSO, SAML, advanced security features',
  'Custom contracts': 'Flexible contract terms',
  'Volume discounts': 'Discounted pricing for high volume',
  'On-premise options': 'Self-hosted deployment available',
};
