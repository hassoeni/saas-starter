/**
 * Template Configuration Manager
 *
 * Loads and manages the template configuration for the SaaS starter
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export type SubscriptionModel = 'token-based' | 'recurring' | 'hybrid';
export type DatabaseProvider = 'local' | 'supabase' | 'vercel' | 'custom';

export interface TemplateConfig {
  version: string;
  subscriptionModel: SubscriptionModel;
  features: {
    tokenUsage: boolean;
    recurringSubscriptions: boolean;
    teamPlans: boolean;
    usageAlerts: boolean;
    meteredBilling: boolean;
    enterprisePlans: boolean;
  };
  plans: {
    individual: string[];
    team: string[];
  };
  database: {
    provider: DatabaseProvider;
    url: string;
  };
  stripe: {
    autoCreateProducts: boolean;
    products: Record<string, {
      productId: string;
      priceId: string;
      type: 'recurring' | 'metered';
    }>;
  };
}

const CONFIG_PATH = path.join(process.cwd(), 'template.config.json');

/**
 * Load template configuration
 */
export async function loadConfig(): Promise<TemplateConfig> {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error('Failed to load template.config.json. Run template setup first.');
  }
}

/**
 * Save template configuration
 */
export async function saveConfig(config: TemplateConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Check if a feature is enabled
 */
export async function isFeatureEnabled(feature: keyof TemplateConfig['features']): Promise<boolean> {
  const config = await loadConfig();
  return config.features[feature] ?? false;
}

/**
 * Get enabled plans
 */
export async function getEnabledPlans(): Promise<string[]> {
  const config = await loadConfig();
  return [...config.plans.individual, ...config.plans.team];
}

/**
 * Create default configuration
 */
export function createDefaultConfig(subscriptionModel: SubscriptionModel): TemplateConfig {
  const features = {
    tokenUsage: subscriptionModel === 'token-based' || subscriptionModel === 'hybrid',
    recurringSubscriptions: subscriptionModel === 'recurring' || subscriptionModel === 'hybrid',
    teamPlans: true,
    usageAlerts: subscriptionModel === 'token-based' || subscriptionModel === 'hybrid',
    meteredBilling: subscriptionModel === 'token-based' || subscriptionModel === 'hybrid',
    enterprisePlans: true,
  };

  let plans: TemplateConfig['plans'];

  if (subscriptionModel === 'token-based') {
    plans = {
      individual: ['pay_as_you_go'],
      team: ['team'],
    };
  } else if (subscriptionModel === 'recurring') {
    plans = {
      individual: ['pro_unlimited'],
      team: ['team', 'enterprise'],
    };
  } else {
    // hybrid
    plans = {
      individual: ['pay_as_you_go', 'pro_unlimited'],
      team: ['team', 'enterprise'],
    };
  }

  return {
    version: '1.0.0',
    subscriptionModel,
    features,
    plans,
    database: {
      provider: 'local',
      url: '',
    },
    stripe: {
      autoCreateProducts: true,
      products: {},
    },
  };
}
