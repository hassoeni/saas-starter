/**
 * Feature Flag System
 *
 * Runtime feature checking based on template configuration
 */

import { loadConfig } from './config';

let configCache: Awaited<ReturnType<typeof loadConfig>> | null = null;

/**
 * Load config with caching
 */
async function getConfig() {
  if (!configCache) {
    try {
      configCache = await loadConfig();
    } catch {
      // Fallback to all features enabled if no config
      console.warn('No template.config.json found, assuming all features enabled');
      return null;
    }
  }
  return configCache;
}

/**
 * Check if a feature is enabled
 */
export async function isEnabled(feature: string): Promise<boolean> {
  const config = await getConfig();
  if (!config) return true; // Default to enabled if no config

  switch (feature) {
    case 'tokenUsage':
      return config.features.tokenUsage;
    case 'recurringSubscriptions':
      return config.features.recurringSubscriptions;
    case 'teamPlans':
      return config.features.teamPlans;
    case 'usageAlerts':
      return config.features.usageAlerts;
    case 'meteredBilling':
      return config.features.meteredBilling;
    case 'enterprisePlans':
      return config.features.enterprisePlans;
    default:
      return false;
  }
}

/**
 * Check if a specific plan is enabled
 */
export async function isPlanEnabled(planId: string): Promise<boolean> {
  const config = await getConfig();
  if (!config) return true;

  return [...config.plans.individual, ...config.plans.team].includes(planId);
}

/**
 * Get enabled plans
 */
export async function getEnabledPlans(): Promise<string[]> {
  const config = await getConfig();
  if (!config) {
    return ['pay_as_you_go', 'pro_unlimited', 'team', 'enterprise'];
  }

  return [...config.plans.individual, ...config.plans.team];
}

/**
 * Filter plans based on configuration
 */
export async function filterEnabledPlans<T extends { id: string }>(plans: T[]): Promise<T[]> {
  const enabledPlanIds = await getEnabledPlans();
  return plans.filter(plan => enabledPlanIds.includes(plan.id));
}

/**
 * Synchronous feature checking (requires config to be preloaded)
 */
export function isEnabledSync(feature: string): boolean {
  if (!configCache) {
    console.warn('Config not loaded, defaulting to true');
    return true;
  }

  switch (feature) {
    case 'tokenUsage':
      return configCache.features.tokenUsage;
    case 'recurringSubscriptions':
      return configCache.features.recurringSubscriptions;
    case 'teamPlans':
      return configCache.features.teamPlans;
    case 'usageAlerts':
      return configCache.features.usageAlerts;
    case 'meteredBilling':
      return configCache.features.meteredBilling;
    case 'enterprisePlans':
      return configCache.features.enterprisePlans;
    default:
      return false;
  }
}

/**
 * Preload configuration (call this at app startup)
 */
export async function preloadConfig() {
  await getConfig();
}

/**
 * Clear config cache (useful for testing)
 */
export function clearCache() {
  configCache = null;
}
