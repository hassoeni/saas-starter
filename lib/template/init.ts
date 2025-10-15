#!/usr/bin/env node
/**
 * SaaS Template Initialization
 *
 * Interactive setup wizard for new projects
 */

import { exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import readline from 'node:readline';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  createDefaultConfig,
  saveConfig,
  type SubscriptionModel,
  type DatabaseProvider,
  type TemplateConfig,
} from './config';
import { setupStripeProducts, useExistingProducts, listStripeProducts } from './stripe-setup';

const execAsync = promisify(exec);

function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

function printHeader() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀  SaaS Starter Template - Project Initialization');
  console.log('='.repeat(60) + '\n');
}

function printSection(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📋 ${title}`);
  console.log('─'.repeat(60) + '\n');
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function selectSubscriptionModel(): Promise<SubscriptionModel> {
  printSection('Step 1: Select Subscription Model');

  console.log('Choose your subscription model:\n');
  console.log('1. Token-based (Usage-based pricing - pay per token)');
  console.log('   - Best for: Pay-as-you-go models, API services');
  console.log('   - Plans: Pay as You Go\n');

  console.log('2. Recurring (Fixed monthly/yearly subscriptions)');
  console.log('   - Best for: SaaS with unlimited usage');
  console.log('   - Plans: Pro Unlimited, Team, Enterprise\n');

  console.log('3. Hybrid (Both token-based and recurring)');
  console.log('   - Best for: Flexible pricing, multiple tiers');
  console.log('   - Plans: All plans enabled\n');

  const choice = await question('Enter your choice (1/2/3): ');

  switch (choice.trim()) {
    case '1':
      return 'token-based';
    case '2':
      return 'recurring';
    case '3':
      return 'hybrid';
    default:
      console.log('Invalid choice, defaulting to hybrid...');
      return 'hybrid';
  }
}

async function configurePlans(config: TemplateConfig): Promise<TemplateConfig> {
  printSection('Step 2: Configure Plans');

  console.log('Current plans enabled:');
  console.log(`  Individual: ${config.plans.individual.join(', ')}`);
  console.log(`  Team: ${config.plans.team.join(', ')}\n`);

  const customize = await question('Do you want to customize plans? (y/n): ');

  if (customize.toLowerCase() === 'y') {
    // Individual plans
    if (config.subscriptionModel === 'hybrid') {
      const includePayg = await question('Include Pay as You Go plan? (y/n): ');
      const includeUnlimited = await question('Include Pro Unlimited plan? (y/n): ');

      config.plans.individual = [];
      if (includePayg.toLowerCase() === 'y') config.plans.individual.push('pay_as_you_go');
      if (includeUnlimited.toLowerCase() === 'y') config.plans.individual.push('pro_unlimited');
    }

    // Team plans
    const includeTeam = await question('Include Team plan? (y/n): ');
    const includeEnterprise = await question('Include Enterprise plan? (y/n): ');

    config.plans.team = [];
    if (includeTeam.toLowerCase() === 'y') config.plans.team.push('team');
    if (includeEnterprise.toLowerCase() === 'y') config.plans.team.push('enterprise');

    // Update features based on selected plans
    config.features.teamPlans = config.plans.team.length > 0;
    config.features.enterprisePlans = config.plans.team.includes('enterprise');
  }

  return config;
}

async function setupDatabase(config: TemplateConfig): Promise<TemplateConfig> {
  printSection('Step 3: Database Setup');

  console.log('Choose database provider:\n');
  console.log('1. Local (Docker Postgres)');
  console.log('2. Supabase');
  console.log('3. Vercel Postgres');
  console.log('4. Custom (enter your own URL)\n');

  const choice = await question('Enter your choice (1/2/3/4): ');

  let provider: DatabaseProvider;
  let dbUrl: string;

  switch (choice.trim()) {
    case '1':
      provider = 'local';
      console.log('\n🐳 Setting up local Postgres with Docker...');
      await setupLocalPostgres();
      dbUrl = 'postgresql://postgres:postgres@localhost:54322/postgres';
      break;

    case '2':
      provider = 'supabase';
      console.log('\n📝 Get your Supabase connection string from:');
      console.log('   https://app.supabase.com/project/_/settings/database');
      dbUrl = await question('\nEnter your Supabase connection string: ');
      break;

    case '3':
      provider = 'vercel';
      console.log('\n📝 Get your Vercel Postgres URL from:');
      console.log('   https://vercel.com/dashboard/stores');
      dbUrl = await question('\nEnter your Vercel Postgres URL: ');
      break;

    case '4':
      provider = 'custom';
      dbUrl = await question('Enter your database URL: ');
      break;

    default:
      throw new Error('Invalid database provider choice');
  }

  config.database.provider = provider;
  config.database.url = dbUrl;

  return config;
}

async function setupLocalPostgres() {
  try {
    await execAsync('docker --version');
  } catch (error) {
    throw new Error('Docker is not installed. Please install Docker first.');
  }

  const dockerComposeContent = `services:
  postgres:
    image: postgres:16.4-alpine
    container_name: saas_starter_postgres
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "54322:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
`;

  await fs.writeFile(path.join(process.cwd(), 'docker-compose.yml'), dockerComposeContent);
  await execAsync('docker compose up -d');
  console.log('✅ Docker container started');
}

async function setupStripe(config: TemplateConfig): Promise<TemplateConfig> {
  printSection('Step 4: Stripe Configuration');

  // Check Stripe CLI
  try {
    await execAsync('stripe --version');
    console.log('✅ Stripe CLI is installed\n');
  } catch (error) {
    throw new Error('Stripe CLI is not installed. Install from: https://docs.stripe.com/stripe-cli');
  }

  // Get Stripe secret key
  console.log('📝 Get your Stripe Secret Key from:');
  console.log('   https://dashboard.stripe.com/test/apikeys\n');
  const stripeSecretKey = await question('Enter your Stripe Secret Key: ');

  // Create products
  console.log('\n');
  const autoCreate = await question('Do you want to automatically create Stripe products? (y/n): ');

  if (autoCreate.toLowerCase() === 'y') {
    config = await setupStripeProducts(config);
  } else {
    await listStripeProducts();
    console.log('\nYou can manually configure product IDs in template.config.json later.');
  }

  // Create webhook
  console.log('\n🔗 Creating Stripe webhook...');
  const { stdout } = await execAsync('stripe listen --print-secret');
  const webhookSecret = stdout.match(/whsec_[a-zA-Z0-9]+/)?.[0];

  if (!webhookSecret) {
    throw new Error('Failed to create webhook secret');
  }

  console.log('✅ Webhook created');

  // Store keys temporarily for .env creation
  (config as any)._stripeSecretKey = stripeSecretKey;
  (config as any)._webhookSecret = webhookSecret;

  return config;
}

async function writeEnvFile(config: TemplateConfig) {
  printSection('Step 5: Creating Environment Files');

  const authSecret = crypto.randomBytes(32).toString('hex');

  const envContent = `# Database
DATABASE_URL="${config.database.url}"

# Stripe
STRIPE_SECRET_KEY=${(config as any)._stripeSecretKey}
STRIPE_WEBHOOK_SECRET=${(config as any)._webhookSecret}

# Authentication
AUTH_SECRET=${authSecret}
BASE_URL=http://localhost:3000

# Usage Alert Configuration
USAGE_CAP_WARNING_THRESHOLD=0.8
USAGE_CAP_URGENT_THRESHOLD=0.95
USAGE_CAP_HARD_LIMIT=1.0
ALERT_EMAIL=billing@yourdomain.com
`;

  await fs.writeFile(path.join(process.cwd(), '.env'), envContent);
  console.log('✅ .env file created');

  // Clean up temporary keys
  delete (config as any)._stripeSecretKey;
  delete (config as any)._webhookSecret;
}

async function runMigrations() {
  printSection('Step 6: Running Database Migrations');

  console.log('Generating migrations...');
  await execAsync('npm run db:generate');

  console.log('Running migrations...');
  await execAsync('npm run db:migrate');

  console.log('✅ Database setup complete');
}

async function main() {
  try {
    printHeader();

    // Check if already configured
    const configPath = path.join(process.cwd(), 'template.config.json');
    const envPath = path.join(process.cwd(), '.env');

    if (await fileExists(configPath)) {
      const overwrite = await question('⚠️  Configuration already exists. Overwrite? (y/n): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        process.exit(0);
      }
    }

    // Step 1: Select subscription model
    const subscriptionModel = await selectSubscriptionModel();
    let config = createDefaultConfig(subscriptionModel);

    // Step 2: Configure plans
    config = await configurePlans(config);

    // Step 3: Database setup
    config = await setupDatabase(config);

    // Step 4: Stripe setup
    config = await setupStripe(config);

    // Save configuration
    await saveConfig(config);
    console.log('\n✅ Configuration saved to template.config.json');

    // Step 5: Write .env
    await writeEnvFile(config);

    // Step 6: Run migrations
    await runMigrations();

    // Complete
    console.log('\n' + '='.repeat(60));
    console.log('🎉  Setup Complete!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('  1. Review template.config.json');
    console.log('  2. Review .env file');
    console.log('  3. Run: npm run dev');
    console.log('  4. Visit: http://localhost:3000\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly (only when executed with tsx)
main().catch((error) => {
  console.error('Setup failed:', error);
  process.exit(1);
});
