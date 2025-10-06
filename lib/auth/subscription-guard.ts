/**
 * Subscription Guard Middleware
 *
 * Protects routes and features that require an active subscription
 */

import { redirect } from 'next/navigation';
import { getAccessInfo, hasActiveSubscription, hasFeatureAccess, hasTokensRemaining } from './access-control';

/**
 * Require active subscription - redirects to pricing if not active
 */
export async function requireSubscription(redirectUrl?: string) {
  const isActive = await hasActiveSubscription();

  if (!isActive) {
    redirect(redirectUrl || '/pricing?error=subscription_required');
  }
}

/**
 * Require specific feature - redirects to upgrade page if not available
 */
export async function requireFeature(feature: string, redirectUrl?: string) {
  const hasAccess = await hasFeatureAccess(feature);

  if (!hasAccess) {
    redirect(redirectUrl || `/pricing?error=feature_required&feature=${feature}`);
  }
}

/**
 * Require available tokens - redirects to billing if no tokens remaining
 */
export async function requireTokens(redirectUrl?: string) {
  const hasTokens = await hasTokensRemaining();

  if (!hasTokens) {
    redirect(redirectUrl || '/pricing?error=tokens_exhausted');
  }
}

/**
 * Get subscription guard info (doesn't redirect, just returns status)
 * Use this in components to show conditional UI
 */
export async function getSubscriptionGuard() {
  const accessInfo = await getAccessInfo();

  return {
    hasAccess: accessInfo.hasAccess,
    status: accessInfo.status,
    planName: accessInfo.planName,
    needsUpgrade: !accessInfo.hasAccess,
    tokens: accessInfo.tokens,
    showUsageWarning: accessInfo.tokens.percentage >= 80,
    showUsageCritical: accessInfo.tokens.percentage >= 95,
    isBlocked: accessInfo.tokens.remaining === 0,
  };
}

/**
 * Check if user can access a specific feature (for conditional rendering)
 */
export async function canAccessFeature(feature: string): Promise<boolean> {
  return await hasFeatureAccess(feature);
}

/**
 * Soft guard - returns boolean instead of redirecting
 * Use for API routes where you want to return error response
 */
export async function checkSubscription(): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const isActive = await hasActiveSubscription();

  if (!isActive) {
    return {
      allowed: false,
      reason: 'Active subscription required',
    };
  }

  return { allowed: true };
}

/**
 * Soft guard for tokens
 */
export async function checkTokens(): Promise<{
  allowed: boolean;
  remaining: number;
  reason?: string;
}> {
  const accessInfo = await getAccessInfo();

  if (accessInfo.tokens.remaining === 0) {
    return {
      allowed: false,
      remaining: 0,
      reason: 'No tokens remaining',
    };
  }

  return {
    allowed: true,
    remaining: accessInfo.tokens.remaining,
  };
}
