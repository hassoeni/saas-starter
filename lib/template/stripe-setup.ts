/**
 * Stripe Product Auto-Configuration
 *
 * Automatically creates Stripe products and prices based on template configuration
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { TemplateConfig } from './config';

const execAsync = promisify(exec);

interface StripeProduct {
  id: string;
  name: string;
  description: string;
}

interface StripePrice {
  id: string;
  product: string;
  unitAmount?: number;
  recurring?: {
    interval: 'month' | 'year';
    usageType?: 'metered' | 'licensed';
  };
}

/**
 * Plan definitions for Stripe product creation
 */
const PLAN_DEFINITIONS = {
  pay_as_you_go: {
    name: 'Pay as You Go',
    description: 'Pay only for what you use. $0.50 per token.',
    price: 50, // $0.50 in cents
    recurring: {
      interval: 'month' as const,
      usageType: 'metered' as const,
    },
  },
  pro_unlimited: {
    name: 'Pro Unlimited',
    description: 'Unlimited tokens at a flat monthly rate.',
    price: 2900, // $29.00 in cents
    recurring: {
      interval: 'month' as const,
      usageType: 'licensed' as const,
    },
  },
  team: {
    name: 'Team',
    description: 'Collaborate with your team. Unlimited tokens per seat.',
    price: 1900, // $19.00 per seat
    recurring: {
      interval: 'month' as const,
      usageType: 'licensed' as const,
    },
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Custom solutions for large organizations.',
    price: 0, // Custom pricing
    recurring: {
      interval: 'month' as const,
      usageType: 'licensed' as const,
    },
  },
};

/**
 * Create a Stripe product via CLI
 */
async function createStripeProduct(
  planId: string,
  definition: typeof PLAN_DEFINITIONS[keyof typeof PLAN_DEFINITIONS]
): Promise<StripeProduct> {
  console.log(`Creating Stripe product: ${definition.name}...`);

  const { stdout } = await execAsync(
    `stripe products create --name "${definition.name}" --description "${definition.description}"`
  );

  const productId = stdout.match(/prod_[a-zA-Z0-9]+/)?.[0];
  if (!productId) {
    throw new Error(`Failed to create product: ${definition.name}`);
  }

  console.log(`✅ Created product: ${productId}`);
  return {
    id: productId,
    name: definition.name,
    description: definition.description,
  };
}

/**
 * Create a Stripe price via CLI
 */
async function createStripePrice(
  productId: string,
  planId: string,
  definition: typeof PLAN_DEFINITIONS[keyof typeof PLAN_DEFINITIONS]
): Promise<StripePrice> {
  console.log(`Creating price for ${definition.name}...`);

  let command = `stripe prices create --product ${productId} --currency usd`;

  if (definition.recurring.usageType === 'metered') {
    // Metered billing (usage-based)
    command += ` --billing-scheme per_unit --recurring[interval]=month --recurring[usage_type]=metered`;
  } else {
    // Recurring subscription
    command += ` --unit-amount ${definition.price} --recurring[interval]=${definition.recurring.interval}`;
  }

  const { stdout } = await execAsync(command);

  const priceId = stdout.match(/price_[a-zA-Z0-9]+/)?.[0];
  if (!priceId) {
    throw new Error(`Failed to create price for product: ${productId}`);
  }

  console.log(`✅ Created price: ${priceId}`);
  return {
    id: priceId,
    product: productId,
    unitAmount: definition.price,
    recurring: definition.recurring,
  };
}

/**
 * Setup Stripe products based on configuration
 */
export async function setupStripeProducts(config: TemplateConfig): Promise<TemplateConfig> {
  console.log('\n📦 Setting up Stripe products...\n');

  const allPlans = [...config.plans.individual, ...config.plans.team];
  const products: TemplateConfig['stripe']['products'] = {};

  for (const planId of allPlans) {
    const definition = PLAN_DEFINITIONS[planId as keyof typeof PLAN_DEFINITIONS];
    if (!definition) {
      console.warn(`⚠️  Unknown plan: ${planId}, skipping...`);
      continue;
    }

    try {
      // Create product
      const product = await createStripeProduct(planId, definition);

      // Create price
      const price = await createStripePrice(product.id, planId, definition);

      // Store in config
      products[planId] = {
        productId: product.id,
        priceId: price.id,
        type: definition.recurring.usageType === 'metered' ? 'metered' : 'recurring',
      };
    } catch (error) {
      console.error(`❌ Failed to create Stripe product for ${planId}:`, error);
      throw error;
    }
  }

  // Update config with product IDs
  config.stripe.products = products;

  console.log('\n✅ All Stripe products created successfully!\n');
  return config;
}

/**
 * List existing Stripe products
 */
export async function listStripeProducts(): Promise<void> {
  console.log('\n📋 Existing Stripe Products:\n');
  const { stdout } = await execAsync('stripe products list --limit 10');
  console.log(stdout);
}

/**
 * Use existing Stripe products (manual entry)
 */
export async function useExistingProducts(
  config: TemplateConfig,
  productMap: Record<string, { productId: string; priceId: string }>
): Promise<TemplateConfig> {
  console.log('\n🔗 Linking existing Stripe products...\n');

  const allPlans = [...config.plans.individual, ...config.plans.team];
  const products: TemplateConfig['stripe']['products'] = {};

  for (const planId of allPlans) {
    if (productMap[planId]) {
      products[planId] = {
        ...productMap[planId],
        type: planId === 'pay_as_you_go' ? 'metered' : 'recurring',
      };
      console.log(`✅ Linked ${planId} to ${productMap[planId].priceId}`);
    } else {
      console.warn(`⚠️  No product mapping provided for ${planId}`);
    }
  }

  config.stripe.products = products;
  return config;
}
