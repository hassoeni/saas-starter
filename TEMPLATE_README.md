# SaaS Starter Template System

This project is now a **reusable template** for creating new SaaS applications with configurable subscription models.

## 🚀 Quick Start

### Option 1: Create a New Project (Recommended)

```bash
# Clone this template
git clone <this-repo-url> my-new-saas
cd my-new-saas

# Install dependencies
npm install

# Run the initialization wizard
npm run template:init
```

### Option 2: Use as GitHub Template

1. Click "Use this template" on GitHub
2. Clone your new repository
3. Run `npm install && npm run template:init`

## 📋 What Gets Configured

The initialization wizard will ask you to choose:

### 1. **Subscription Model**
- **Token-based**: Usage-based pricing (pay per token)
  - Plans: Pay as You Go
  - Features: Metered billing, usage alerts

- **Recurring**: Fixed monthly/yearly subscriptions
  - Plans: Pro Unlimited, Team, Enterprise
  - Features: Flat-rate billing, team management

- **Hybrid**: Both token-based and recurring (Most flexible)
  - Plans: All plans enabled
  - Features: Full feature set

### 2. **Database Provider**
- Local (Docker Postgres)
- Supabase
- Vercel Postgres
- Custom URL

### 3. **Stripe Configuration**
- Auto-create products and prices
- Or link to existing Stripe products
- Webhook setup

### 4. **Feature Flags**

Based on your subscription model choice, features are automatically enabled/disabled:

```json
{
  "tokenUsage": true/false,
  "recurringSubscriptions": true/false,
  "teamPlans": true/false,
  "usageAlerts": true/false,
  "meteredBilling": true/false,
  "enterprisePlans": true/false
}
```

## 📁 Template Files

### Configuration Files
- `template.config.json` - Your project's template configuration
- `lib/template/config.ts` - Configuration loader
- `lib/template/config.schema.json` - JSON schema for validation

### Setup Scripts
- `lib/template/init.ts` - Interactive initialization wizard
- `lib/template/stripe-setup.ts` - Stripe product auto-creation
- `lib/template/features.ts` - Runtime feature flag checking

### CLI Tool
- `create-saas-app.js` - Standalone CLI for creating new projects

## 🎯 Usage Examples

### Example 1: Token-Based SaaS (API Service)

```bash
npm run template:init

# Choose:
# 1. Subscription Model: Token-based
# 2. Plans: Pay as You Go
# 3. Database: Supabase
# 4. Stripe: Auto-create products

# Result: Pay-per-use API service with metered billing
```

### Example 2: Traditional SaaS (Fixed Monthly Plans)

```bash
npm run template:init

# Choose:
# 1. Subscription Model: Recurring
# 2. Plans: Pro, Team, Enterprise
# 3. Database: Vercel
# 4. Stripe: Auto-create products

# Result: Traditional SaaS with fixed monthly pricing
```

### Example 3: Hybrid Model (Maximum Flexibility)

```bash
npm run template:init

# Choose:
# 1. Subscription Model: Hybrid
# 2. Plans: All enabled
# 3. Database: Supabase
# 4. Stripe: Auto-create products

# Result: Flexible pricing with both usage and recurring plans
```

## 🔧 Advanced Configuration

### Manual Configuration

Edit `template.config.json` directly:

```json
{
  "version": "1.0.0",
  "subscriptionModel": "hybrid",
  "features": {
    "tokenUsage": true,
    "recurringSubscriptions": true,
    "teamPlans": false,
    "usageAlerts": true,
    "meteredBilling": true,
    "enterprisePlans": false
  },
  "plans": {
    "individual": ["pay_as_you_go", "pro_unlimited"],
    "team": []
  }
}
```

### Reset Configuration

```bash
npm run template:reset
```

This will delete your existing configuration and re-run the wizard.

### Runtime Feature Checking

In your code, check if features are enabled:

```typescript
import { isEnabled } from '@/lib/template/features';

// In an async function
const hasTokens = await isEnabled('tokenUsage');
if (hasTokens) {
  // Show token usage UI
}

// Filter plans
import { getAllPlans } from '@/lib/payments/plans';
const plans = await getAllPlans(); // Only returns enabled plans
```

## 📦 Publishing Your Template

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Enable GitHub Template

1. Go to Repository Settings
2. Check "Template repository"

### 3. Share with Others

```bash
# Others can now use:
npx degit your-username/your-template my-new-saas
cd my-new-saas
npm install && npm run template:init
```

## 🔄 Updating Existing Projects

If you've already configured a project and want to change models:

1. Run `npm run template:reset`
2. Choose your new configuration
3. Database migrations will be re-run if needed

## 🛠️ Development

### Project Structure

```
lib/
├── template/
│   ├── config.ts           # Configuration management
│   ├── config.schema.json  # JSON schema
│   ├── features.ts         # Feature flag system
│   ├── init.ts            # Initialization wizard
│   └── stripe-setup.ts    # Stripe automation
├── payments/
│   └── plans.ts           # Now reads from config
└── db/
    └── schema.ts          # Supports all models
```

### Adding New Plans

1. Add plan definition in `lib/template/stripe-setup.ts`:

```typescript
const PLAN_DEFINITIONS = {
  my_new_plan: {
    name: 'My New Plan',
    description: 'Description',
    price: 4900,
    recurring: { interval: 'month', usageType: 'licensed' }
  }
}
```

2. Add to `lib/payments/plans.ts`
3. Update `template.config.json` to include it

## 📝 Environment Variables

After running `template:init`, these are automatically configured in `.env`:

```bash
DATABASE_URL=<your-database-url>
STRIPE_SECRET_KEY=<auto-filled>
STRIPE_WEBHOOK_SECRET=<auto-generated>
AUTH_SECRET=<auto-generated>
BASE_URL=http://localhost:3000
```

### Per-Plan Price IDs (Optional)

You can also use environment variables for price IDs:

```bash
STRIPE_PRICE_PAY_AS_YOU_GO=price_xxx
STRIPE_PRICE_PRO_UNLIMITED=price_xxx
STRIPE_PRICE_TEAM=price_xxx
STRIPE_PRICE_ENTERPRISE=price_xxx
```

## 🤝 Contributing

To improve this template:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `npm run template:init`
5. Submit a pull request

## 📄 License

MIT License - Use this template for any project, commercial or personal.

---

**Built with:**
- Next.js 15
- TypeScript
- Stripe
- Drizzle ORM
- Tailwind CSS
