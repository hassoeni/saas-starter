# 🎨 SaaS Template System - Complete Guide

Your codebase is now a **fully reusable template** for creating new SaaS projects with configurable subscription models.

## 📦 What Was Built

### 1. Configuration System
- **`template.config.json`** - Project configuration file
- **`lib/template/config.ts`** - Configuration loader with caching
- **`lib/template/config.schema.json`** - JSON schema for validation

### 2. Setup & Initialization
- **`lib/template/init.ts`** - Interactive wizard for project setup
- **`lib/template/stripe-setup.ts`** - Auto-creates Stripe products/prices
- **`create-saas-app.js`** - Standalone CLI for new projects

### 3. Feature Flag System
- **`lib/template/features.ts`** - Runtime feature checking
- **`lib/payments/plans.ts`** - Now reads from config to filter plans

### 4. Documentation
- **`TEMPLATE_README.md`** - Complete usage guide
- **`.template-examples.md`** - Configuration presets and examples
- **`.env.template`** - Environment variable template

## 🚀 How to Use This Template

### For This Project (First Time Setup)
```bash
npm run template:init
```

This will:
1. Ask you to choose a subscription model (token-based, recurring, or hybrid)
2. Configure which plans to enable
3. Setup your database (local Docker, Supabase, or custom)
4. Auto-create Stripe products and prices
5. Generate `.env` file with all secrets
6. Run database migrations

### For New Projects (Cloning This Template)

**Option 1: Manual Clone**
```bash
git clone <this-repo> my-new-saas
cd my-new-saas
rm -rf .git
npm install
npm run template:init
```

**Option 2: GitHub Template**
1. Make this repo a GitHub template (Settings → Template repository)
2. Click "Use this template" to create new repos
3. Clone and run `npm install && npm run template:init`

**Option 3: Standalone CLI** (Future)
```bash
npx create-saas-app my-new-saas
# Automatically clones, installs, and runs setup wizard
```

## 🎯 Subscription Models Explained

### 1. Token-Based (Usage-Based Pricing)
```json
{
  "subscriptionModel": "token-based",
  "plans": {
    "individual": ["pay_as_you_go"],
    "team": []
  }
}
```
**When to use:** API services, AI platforms, pay-per-use models
**Examples:** OpenAI, Anthropic, Replicate

### 2. Recurring (Fixed Monthly/Yearly)
```json
{
  "subscriptionModel": "recurring",
  "plans": {
    "individual": ["pro_unlimited"],
    "team": ["team", "enterprise"]
  }
}
```
**When to use:** Traditional SaaS, unlimited usage
**Examples:** Notion, Linear, Figma

### 3. Hybrid (Both Models)
```json
{
  "subscriptionModel": "hybrid",
  "plans": {
    "individual": ["pay_as_you_go", "pro_unlimited"],
    "team": ["team", "enterprise"]
  }
}
```
**When to use:** Maximum flexibility, freemium models
**Examples:** Vercel, GitHub, AWS

## 🔧 Configuration Options

### Features You Can Toggle
```typescript
{
  tokenUsage: boolean          // Track and bill for token usage
  recurringSubscriptions: boolean  // Enable monthly/yearly subscriptions
  teamPlans: boolean           // Enable team/organization features
  usageAlerts: boolean         // Alert users when approaching limits
  meteredBilling: boolean      // Stripe metered billing for usage
  enterprisePlans: boolean     // Enable enterprise tier
}
```

### Available Plans
- **`pay_as_you_go`** - Metered billing, pay per token ($0.50/token)
- **`pro_unlimited`** - Fixed monthly, unlimited tokens ($29/mo)
- **`team`** - Per-seat pricing for teams ($19/seat/mo)
- **`enterprise`** - Custom pricing, custom features

## 📋 File Structure

```
.
├── template.config.json          # Your project configuration
├── lib/
│   ├── template/
│   │   ├── config.ts             # Config loader
│   │   ├── config.schema.json    # JSON schema
│   │   ├── features.ts           # Feature flags
│   │   ├── init.ts              # Setup wizard
│   │   └── stripe-setup.ts      # Stripe automation
│   ├── payments/
│   │   └── plans.ts             # Now config-aware
│   └── db/
│       └── schema.ts            # Supports all models
├── create-saas-app.js           # CLI for new projects
├── TEMPLATE_README.md           # Main documentation
├── .template-examples.md        # Configuration examples
└── .env.template                # Environment template
```

## 💻 NPM Scripts

```bash
# Template Management
npm run template:init       # Run setup wizard
npm run template:reset      # Delete config and re-run wizard

# Database
npm run db:setup           # Old setup (replaced by template:init)
npm run db:generate        # Generate migrations
npm run db:migrate         # Run migrations
npm run db:studio          # Open Drizzle Studio

# Development
npm run dev                # Start dev server
npm run build              # Build for production
npm start                  # Start production server
```

## 🎨 Customization

### Adding a New Plan

1. **Define in Stripe setup** (`lib/template/stripe-setup.ts`):
```typescript
const PLAN_DEFINITIONS = {
  my_custom_plan: {
    name: 'Custom Plan',
    description: 'My custom plan description',
    price: 4900, // $49.00
    recurring: {
      interval: 'month',
      usageType: 'licensed'
    }
  }
}
```

2. **Add to plans** (`lib/payments/plans.ts`):
```typescript
export type PlanType = 'pay_as_you_go' | 'pro_unlimited' | 'team' | 'enterprise' | 'my_custom_plan';

export const PLANS: Record<PlanType, PlanConfig> = {
  my_custom_plan: {
    id: 'my_custom_plan',
    name: 'Custom Plan',
    // ... config
  }
}
```

3. **Enable in config**:
```json
{
  "plans": {
    "individual": ["my_custom_plan"]
  }
}
```

### Using Feature Flags in Code

```typescript
import { isEnabled } from '@/lib/template/features';

// Check if feature is enabled
if (await isEnabled('tokenUsage')) {
  // Show token usage UI
}

// Filter plans by config
import { getAllPlans } from '@/lib/payments/plans';
const plans = await getAllPlans(); // Only enabled plans
```

## 🌍 Sharing This Template

### Method 1: GitHub Template Repository

1. Push to GitHub
2. Go to Settings → Check "Template repository"
3. Share the repo URL

Users can then:
```bash
# Use GitHub's "Use this template" button
# Or clone manually:
git clone your-repo my-project
cd my-project
npm install && npm run template:init
```

### Method 2: NPM Package (Future)

Publish `create-saas-app.js` as an npm package:
```bash
npm publish
```

Users can then:
```bash
npx your-create-saas-app my-project
```

### Method 3: Degit

```bash
npx degit your-username/saas-starter my-project
cd my-project
npm install && npm run template:init
```

## 🔄 Migrating Between Models

### Scenario: Started with Token-Based, Want to Add Recurring

1. Edit `template.config.json`:
```json
{
  "subscriptionModel": "hybrid",
  "features": {
    "tokenUsage": true,
    "recurringSubscriptions": true
  },
  "plans": {
    "individual": ["pay_as_you_go", "pro_unlimited"]
  }
}
```

2. Run setup to create new Stripe products:
```bash
npm run template:init
```

3. Existing token usage data is preserved!

## 📊 Real-World Examples

### Example 1: Building an AI API
```bash
npm run template:init
# Choose: Token-based
# Plans: Pay as You Go
# Database: Supabase
# Result: Usage-based API service
```

### Example 2: Building a Project Management Tool
```bash
npm run template:init
# Choose: Recurring
# Plans: Pro, Team, Enterprise
# Database: Vercel
# Result: Team collaboration SaaS
```

### Example 3: Building a Hybrid Platform
```bash
npm run template:init
# Choose: Hybrid
# Plans: All
# Database: Supabase
# Result: Flexible pricing like Vercel
```

## 🐛 Troubleshooting

### "Plans not showing up"
- Check `template.config.json` - ensure plans are listed
- Run `npm run template:init` to regenerate config

### "Stripe products missing"
- Verify Stripe CLI is installed: `stripe --version`
- Re-run setup: `npm run template:init`

### "Features not working"
- Check feature flags in `template.config.json`
- Verify imports: `import { isEnabled } from '@/lib/template/features'`

### "Database connection failed"
- Check `.env` for correct `DATABASE_URL`
- Test connection: `npm run db:studio`

## 🎯 Next Steps

1. **Read** `TEMPLATE_README.md` for detailed usage
2. **Check** `.template-examples.md` for configuration presets
3. **Run** `npm run template:init` to configure your project
4. **Build** your SaaS! 🚀

## 📄 Files Reference

| File | Purpose |
|------|---------|
| `template.config.json` | Project configuration |
| `lib/template/init.ts` | Setup wizard |
| `lib/template/config.ts` | Config loader |
| `lib/template/features.ts` | Feature flags |
| `lib/template/stripe-setup.ts` | Stripe automation |
| `lib/payments/plans.ts` | Plan definitions (config-aware) |
| `TEMPLATE_README.md` | Main documentation |
| `.template-examples.md` | Configuration examples |
| `.env.template` | Environment template |

---

**You're all set!** 🎉

This codebase is now a production-ready, reusable template for any SaaS business model.
