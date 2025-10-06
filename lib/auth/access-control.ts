import { getUser, getTeamForUser } from '../db/queries';
import { db } from '../db/drizzle';
import { tokenUsage } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { getProductFeatures, hasFeature, getTokenLimit } from '../payments/product-features';
import { type PlanType } from '../payments/plans';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'none';

/**
 * Get the effective plan type (user plan takes priority)
 */
export async function getEffectivePlanType(): Promise<PlanType | null> {
  const user = await getUser();
  if (!user) return null;

  const team = await getTeamForUser();
  return (user.planType || team?.planType) as PlanType | null;
}

/**
 * Get the current subscription status (user or team)
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const user = await getUser();
  if (!user) return 'none';

  const team = await getTeamForUser();

  // User subscription takes priority
  if (user.subscriptionStatus) {
    return user.subscriptionStatus as SubscriptionStatus;
  }

  // Fall back to team subscription
  if (team?.subscriptionStatus) {
    return team.subscriptionStatus as SubscriptionStatus;
  }

  return 'none';
}

/**
 * Check if user has an active subscription (active or trialing)
 */
export async function hasActiveSubscription(): Promise<boolean> {
  const status = await getSubscriptionStatus();
  return status === 'active' || status === 'trialing';
}

/**
 * Check if a specific feature is available for the current user
 */
export async function hasFeatureAccess(feature: string): Promise<boolean> {
  const planType = await getEffectivePlanType();

  if (!planType) {
    return false;
  }

  // Check if subscription is active
  const isActive = await hasActiveSubscription();
  if (!isActive) {
    return false;
  }

  // Check if plan includes the feature
  return hasFeature(planType, feature);
}

/**
 * Get remaining tokens for the current month
 */
export async function getRemainingTokens(): Promise<number> {
  const user = await getUser();
  if (!user) return 0;

  const planType = await getEffectivePlanType();
  if (!planType) return 0;

  const tokenLimit = getTokenLimit(planType);

  // -1 means unlimited
  if (tokenLimit === -1) {
    return Number.MAX_SAFE_INTEGER;
  }

  // 0 means metered (no fixed limit)
  if (tokenLimit === 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  // Get current month usage for this user
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfMonthISO = firstDayOfMonth.toISOString();

  const monthlyUsage = await db
    .select({
      total: sql<number>`COALESCE(SUM(${tokenUsage.tokens}), 0)`,
    })
    .from(tokenUsage)
    .where(eq(tokenUsage.userId, user.id))
    .where(sql`${tokenUsage.createdAt} >= ${firstDayOfMonthISO}::timestamp`);

  const used = monthlyUsage[0]?.total || 0;
  return Math.max(0, tokenLimit - used);
}

/**
 * Check if user has tokens remaining
 */
export async function hasTokensRemaining(): Promise<boolean> {
  const planType = await getEffectivePlanType();
  if (!planType) return false;

  const tokenLimit = getTokenLimit(planType);

  // -1 or 0 means unlimited
  if (tokenLimit === -1 || tokenLimit === 0) {
    return true;
  }

  const remaining = await getRemainingTokens();
  return remaining > 0;
}

/**
 * Get token usage percentage (0-100)
 */
export async function getTokenUsagePercentage(): Promise<number> {
  const user = await getUser();
  if (!user) return 0;

  const planType = await getEffectivePlanType();
  if (!planType) return 0;

  const tokenLimit = getTokenLimit(planType);

  // Unlimited plans show 0% usage
  if (tokenLimit === -1 || tokenLimit === 0) {
    return 0;
  }

  const remaining = await getRemainingTokens();
  const used = tokenLimit - remaining;

  return Math.min(100, (used / tokenLimit) * 100);
}

/**
 * Check if usage is above a warning threshold
 */
export async function isAboveUsageThreshold(threshold: number): Promise<boolean> {
  const percentage = await getTokenUsagePercentage();
  return percentage >= threshold;
}

/**
 * Get comprehensive access info for the current user
 */
export async function getAccessInfo() {
  const user = await getUser();

  if (!user) {
    return {
      hasAccess: false,
      status: 'none' as SubscriptionStatus,
      features: null,
      planType: null,
      tokens: {
        limit: 0,
        remaining: 0,
        used: 0,
        percentage: 0,
      },
    };
  }

  const status = await getSubscriptionStatus();
  const isActive = status === 'active' || status === 'trialing';
  const planType = await getEffectivePlanType();
  const features = getProductFeatures(planType);
  const tokenLimit = getTokenLimit(planType);
  const remaining = await getRemainingTokens();
  const used = tokenLimit > 0 ? tokenLimit - remaining : 0;
  const percentage = await getTokenUsagePercentage();

  return {
    hasAccess: isActive,
    status,
    planType,
    features,
    tokens: {
      limit: tokenLimit,
      remaining,
      used,
      percentage,
    },
  };
}

/**
 * Require active subscription - throws error if not active
 */
export async function requireActiveSubscription() {
  const isActive = await hasActiveSubscription();

  if (!isActive) {
    throw new Error('Active subscription required');
  }
}

/**
 * Require specific feature - throws error if not available
 */
export async function requireFeature(feature: string) {
  const hasAccess = await hasFeatureAccess(feature);

  if (!hasAccess) {
    throw new Error(`Feature '${feature}' not available on current plan`);
  }
}

/**
 * Require available tokens - throws error if no tokens remaining
 */
export async function requireTokens() {
  const hasTokens = await hasTokensRemaining();

  if (!hasTokens) {
    throw new Error('No tokens remaining');
  }
}
