# 🚀 Quick Start Guide

## For a Brand New Project (Building Your SaaS)

### Step 1: Clone This Template
```bash
# Option A: Clone via Git
git clone https://github.com/yourusername/saas-starter.git my-awesome-saas
cd my-awesome-saas
rm -rf .git  # Remove template's git history

# Option B: Use GitHub Template (if enabled)
# Click "Use this template" on GitHub, then:
git clone https://github.com/yourusername/my-awesome-saas.git
cd my-awesome-saas
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Setup Wizard
```bash
npm run template:init
```

**The wizard will ask you:**

#### Question 1: Subscription Model
```
Choose your subscription model:

1. Token-based (pay per use)
   → Best for: API services, AI tools
   → Example: OpenAI, Anthropic

2. Recurring (fixed monthly)
   → Best for: Traditional SaaS, unlimited usage
   → Example: Notion, Linear

3. Hybrid (both models)
   → Best for: Flexible pricing
   → Example: Vercel, GitHub

Enter your choice (1/2/3): _
```

**Pick based on your business model.**

#### Question 2: Database
```
Choose database provider:

1. Local (Docker Postgres)
   → For development

2. Supabase
   → Free tier, PostgreSQL

3. Vercel Postgres
   → Integrated with Vercel

4. Custom
   → Your own URL

Enter your choice (1/2/3/4): _
```

**For development, pick 1 (Local).**
**For production, pick 2 (Supabase) or 3 (Vercel).**

#### Question 3: Stripe Setup
```
Enter your Stripe Secret Key: sk_test_...
```

Get this from: https://dashboard.stripe.com/test/apikeys

```
Do you want to automatically create Stripe products? (y/n): _
```

**Type `y`** - This creates all products/prices for you automatically!

### Step 4: Done! 🎉
```bash
npm run dev
```

Visit: http://localhost:3000

---

## What Just Happened?

The setup wizard:
1. ✅ Created `template.config.json` with your choices
2. ✅ Created Stripe products and prices automatically
3. ✅ Generated `.env` file with all secrets
4. ✅ Started Docker Postgres (if you chose local)
5. ✅ Ran database migrations

---

## Example Walkthrough

### Scenario: Building an AI API Service

```bash
# Step 1
git clone <template> my-ai-api
cd my-ai-api

# Step 2
npm install

# Step 3
npm run template:init

# Answers:
# Subscription Model: 1 (Token-based)
# Database: 2 (Supabase)
# Enter Supabase URL: postgresql://...
# Enter Stripe Key: sk_test_...
# Auto-create products: y

# Done!
npm run dev
```

**Result:**
- Pay-as-you-go pricing ($0.50/token)
- Metered billing through Stripe
- Ready to deploy!

---

### Scenario: Building a Team Collaboration SaaS

```bash
# Steps 1-2 same as above

npm run template:init

# Answers:
# Subscription Model: 2 (Recurring)
# Customize plans: y
# Include Pro: y
# Include Team: y
# Include Enterprise: y
# Database: 3 (Vercel)
# Enter Vercel URL: postgresql://...
# Stripe Key: sk_test_...
# Auto-create: y

npm run dev
```

**Result:**
- Pro plan: $29/month unlimited
- Team plan: $19/user/month
- Enterprise: Custom pricing
- Team features enabled

---

## Troubleshooting

### "Stripe CLI not found"
```bash
# Install Stripe CLI
# Mac: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe
# Linux: See https://docs.stripe.com/stripe-cli

# Then login
stripe login
```

### "Docker not running" (if using local DB)
```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# Start Docker, then re-run:
npm run template:init
```

### "DATABASE_URL error"
Your database URL might be wrong. Check:
- Supabase: Project Settings → Database → Connection String
- Vercel: Dashboard → Storage → Your Database → .env.local tab

### "Already configured" Warning
```bash
# To reconfigure:
npm run template:reset

# Or manually:
rm template.config.json .env
npm run template:init
```

---

## Next Steps After Setup

### 1. Test Authentication
```bash
npm run dev
# Visit http://localhost:3000/sign-up
# Create a test account
```

### 2. Test Pricing Page
```bash
# Visit http://localhost:3000/pricing
# You should see your configured plans
```

### 3. Test Stripe Checkout
```bash
# Make sure Stripe CLI is listening:
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Then click a plan and go through checkout
# Use test card: 4242 4242 4242 4242
```

### 4. Customize Your App
- Edit branding in `app/layout.tsx`
- Modify plans in `template.config.json`
- Add features to your app!

### 5. Deploy
```bash
# Vercel (recommended)
vercel

# Or other platforms
npm run build
```

---

## File You'll Need to Know

| File | Purpose |
|------|---------|
| `template.config.json` | Your project configuration |
| `.env` | Environment variables (secrets) |
| `lib/payments/plans.ts` | Plan definitions |
| `app/(dashboard)/pricing/page.tsx` | Pricing page |
| `lib/db/schema.ts` | Database schema |

---

## Common Commands

```bash
# Development
npm run dev                 # Start dev server
npm run db:studio          # Open database GUI

# Template Management
npm run template:init      # Initial setup
npm run template:reset     # Reconfigure

# Database
npm run db:generate        # Generate migrations
npm run db:migrate         # Run migrations

# Stripe
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Getting Help

1. Check `TEMPLATE_README.md` for detailed docs
2. Check `.template-examples.md` for configuration examples
3. Check `TEMPLATE_SYSTEM.md` for architecture details
4. Open an issue on GitHub

---

**You're all set!** Start building your SaaS! 🚀
