# 🏗️ Template System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SaaS Starter Template                     │
│                                                               │
│  Reusable template for building SaaS apps with configurable  │
│  subscription models (token-based, recurring, or hybrid)     │
└─────────────────────────────────────────────────────────────┘
```

## System Flow

```
1. Clone Template
   ↓
2. npm install
   ↓
3. npm run template:init
   ↓
   ┌───────────────────────────────────────┐
   │    Interactive Setup Wizard           │
   │                                       │
   │  → Select subscription model          │
   │  → Choose plans                       │
   │  → Configure database                 │
   │  → Setup Stripe                       │
   └───────────────────────────────────────┘
   ↓
4. Generated Files
   ├── template.config.json
   ├── .env
   └── Stripe products created
   ↓
5. npm run dev
   ↓
6. Your configured SaaS app! 🎉
```

## Core Components

### 1. Configuration System

```
template.config.json
    ↓
lib/template/config.ts (loader)
    ↓
    ├→ lib/template/features.ts (feature flags)
    ├→ lib/payments/plans.ts (filtered plans)
    └→ app components (conditional UI)
```

**Purpose:** Central source of truth for what features/plans are enabled

**Key Functions:**
- `loadConfig()` - Reads template.config.json
- `isFeatureEnabled()` - Check if feature is on
- `getEnabledPlans()` - Get list of active plans

### 2. Setup Wizard

```
npm run template:init
    ↓
lib/template/init.ts
    ↓
    ├─→ selectSubscriptionModel()
    │       └→ createDefaultConfig()
    │
    ├─→ configurePlans()
    │       └→ Enable/disable individual plans
    │
    ├─→ setupDatabase()
    │       ├→ Local: Docker compose
    │       ├→ Supabase: Connection string
    │       └→ Custom: Manual URL
    │
    ├─→ setupStripe()
    │       ├→ Get API key
    │       └→ lib/template/stripe-setup.ts
    │               ├→ createStripeProduct()
    │               └→ createStripePrice()
    │
    ├─→ writeEnvFile()
    │       └→ Generate .env
    │
    └─→ runMigrations()
            └→ db:generate && db:migrate
```

### 3. Stripe Automation

```
lib/template/stripe-setup.ts
    ↓
PLAN_DEFINITIONS (plans config)
    ↓
For each enabled plan:
    ├→ stripe products create
    └→ stripe prices create
         ↓
    Store in template.config.json
         ↓
    Write to .env (optional)
```

**Result:** All Stripe products/prices created automatically

### 4. Feature Flag System

```
Runtime Check:
    ↓
import { isEnabled } from '@/lib/template/features'
    ↓
await isEnabled('tokenUsage')
    ↓
    ├─ true  → Show token UI
    └─ false → Hide token UI


Plan Filtering:
    ↓
import { getAllPlans } from '@/lib/payments/plans'
    ↓
await getAllPlans()
    ↓
Returns only enabled plans from config
```

## Data Flow

### Configuration → Application

```
┌────────────────────────────────┐
│   template.config.json         │
│                                │
│   subscriptionModel: "hybrid"  │
│   plans: {                     │
│     individual: ["pay_as_you_go"]│
│     team: ["team"]             │
│   }                            │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│   Runtime Loading              │
│                                │
│   loadConfig() reads file      │
│   Caches in memory             │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│   Feature Checks               │
│                                │
│   isEnabled('tokenUsage')      │
│   → Returns true/false         │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│   Plan Filtering               │
│                                │
│   getAllPlans()                │
│   → Returns [pay_as_you_go, team]│
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│   UI Rendering                 │
│                                │
│   Pricing page shows filtered  │
│   plans only                   │
└────────────────────────────────┘
```

## Subscription Models

### Token-Based (Usage)

```
┌──────────────────────┐
│  Pay as You Go Plan  │
│  $0.50 per token     │
└──────────────────────┘
         ↓
Stripe Metered Billing
         ↓
lib/payments/usage-tracking.ts
         ↓
Report usage to Stripe
         ↓
Customer billed monthly
```

**Features Enabled:**
- ✅ Token usage tracking
- ✅ Usage alerts
- ✅ Metered billing
- ❌ Recurring subscriptions
- ❌ Team plans

### Recurring (Fixed)

```
┌──────────────────────┐
│  Pro Plan            │
│  $29/month unlimited │
└──────────────────────┘
         ↓
Stripe Subscription
         ↓
Immediate access
         ↓
Billed monthly
```

**Features Enabled:**
- ❌ Token usage tracking
- ❌ Usage alerts
- ❌ Metered billing
- ✅ Recurring subscriptions
- ✅ Team plans

### Hybrid (Both)

```
┌──────────────────────┐
│  Pay as You Go       │
│  $0.50/token         │
│                      │
│  Pro Unlimited       │
│  $29/month           │
│                      │
│  Team                │
│  $19/user/month      │
└──────────────────────┘
```

**Features Enabled:**
- ✅ Token usage tracking
- ✅ Usage alerts
- ✅ Metered billing
- ✅ Recurring subscriptions
- ✅ Team plans

## File Dependencies

```
app/(dashboard)/pricing/page.tsx
    ↓ imports
lib/payments/plans.ts
    ↓ imports
lib/template/config.ts
    ↓ reads
template.config.json
```

**Chain:**
UI → Plans → Config → JSON file

## Database Schema

```
users
├── id
├── email
├── stripeCustomerId
├── stripeSubscriptionId
├── planType (from config)
└── subscriptionStatus

teams (if teamPlans enabled)
├── id
├── name
├── stripeCustomerId
├── stripeSubscriptionId
└── planType

tokenUsage (if tokenUsage enabled)
├── id
├── userId
├── tokens
└── createdAt

usageAlerts (if usageAlerts enabled)
├── id
├── teamId
├── alertType
└── tokensUsed
```

**Flexible:** All tables exist, but only used if features enabled

## Deployment Flow

```
Development:
  npm run dev
  Stripe test mode
  Local database

Production:
  1. Update .env with production values
     - DATABASE_URL → Production DB
     - STRIPE_SECRET_KEY → Live key
     - STRIPE_WEBHOOK_SECRET → Live webhook

  2. Deploy to Vercel/Railway/etc
     vercel --prod

  3. Setup Stripe webhook
     Dashboard → Webhooks → Add endpoint
     URL: https://yourdomain.com/api/stripe/webhook
```

## Extension Points

### Adding a New Plan

```
1. Define in stripe-setup.ts:
   PLAN_DEFINITIONS.my_plan = {
     name: 'My Plan',
     price: 4900,
     ...
   }

2. Add to plans.ts:
   export type PlanType = '...' | 'my_plan'
   PLANS.my_plan = { ... }

3. Enable in config:
   template.config.json
   "plans": {
     "individual": ["my_plan"]
   }

4. Re-run setup:
   npm run template:init
```

### Adding a New Feature Flag

```
1. Add to config.ts:
   features: {
     myFeature: boolean
   }

2. Add to features.ts:
   case 'myFeature':
     return config.features.myFeature

3. Use in code:
   if (await isEnabled('myFeature')) {
     // Show feature
   }
```

## Security Considerations

```
✅ Secrets in .env (not committed)
✅ Stripe webhook signature verification
✅ Database connection via env var
✅ Auth tokens generated with crypto
❌ template.config.json (can be committed)
   → Contains no secrets
   → Just configuration choices
```

## Performance

```
Configuration Loading:
- Loaded once on startup
- Cached in memory
- No repeated file reads

Plan Filtering:
- Async operations
- Minimal overhead
- Returns subset of plans

Feature Checks:
- Synchronous option available
- Fast dictionary lookup
```

## Error Handling

```
Config Missing:
  loadConfig() throws error
  → Fallback to all features enabled

Stripe CLI Missing:
  Detected in init.ts
  → Prints install instructions

Database Connection Failed:
  Caught in webhook handler
  → Returns 500, Stripe retries

Invalid Configuration:
  JSON schema validation
  → CI/CD catches issues
```

## Testing Strategy

```
Unit Tests:
  - Config loader
  - Feature flag logic
  - Plan filtering

Integration Tests:
  - Setup wizard flow
  - Stripe product creation
  - Database migrations

E2E Tests:
  - Full user signup
  - Subscription creation
  - Token usage tracking
```

---

## Quick Reference

| Component | File | Purpose |
|-----------|------|---------|
| Config Schema | `lib/template/config.ts` | Define configuration structure |
| Setup Wizard | `lib/template/init.ts` | Interactive project setup |
| Stripe Automation | `lib/template/stripe-setup.ts` | Auto-create products |
| Feature Flags | `lib/template/features.ts` | Runtime feature checks |
| Plan Definitions | `lib/payments/plans.ts` | Available plans |
| Configuration | `template.config.json` | Your project config |
| Secrets | `.env` | API keys, DB URL |

---

This architecture allows you to **clone once, configure many times** for different SaaS projects!
