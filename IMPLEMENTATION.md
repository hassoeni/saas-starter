  PHASE 1: Foundation & Critical Fixes (Week 1)

  ✅ Already Completed:

  1. Metered price detection in checkout
  2. Automatic payment methods enabled
  3. Basic meter event recording
  4. Token usage tracking in database

  🔧 To Implement:

  1.1 Add Idempotency Keys to Meter Events

  Why: Prevent duplicate charges if request retries
  Where: app/api/tokens/consume/route.ts
  // Use: teamId + userId + timestamp + action as
  idempotency key
  const idempotencyKey =
  `${team.id}-${user.id}-${Date.now()}-${action}`;

  1.2 Centralized Stripe Error Handling

  Create: lib/payments/stripe-utils.ts
  - Wrapper for all Stripe API calls
  - Automatic retry with exponential backoff
  - Structured error logging
  - Circuit breaker for repeated failures

  1.3 Webhook Event Logging

  Add table: stripe_events
  - id, event_id, event_type, processed, created_at,
   payload
  Prevents duplicate processing & provides audit
  trail

  ---
  PHASE 2: Enhanced Webhook System (Week 1-2)

  2.1 Comprehensive Webhook Handlers

  Add handlers for:

  // Billing Events
  'invoice.payment_succeeded'      // Update
  subscription status, send receipt
  'invoice.payment_failed'         // Suspend
  access, send dunning email
  'invoice.finalized'              // Store final
  invoice for records
  'invoice.upcoming'               // Alert user of
  upcoming charge

  // Subscription Events
  'customer.subscription.created'  // Provision
  access
  'customer.subscription.updated'  // Handle plan
  changes, update access
  'customer.subscription.deleted'  // Deprovision
  access
  'customer.subscription.trial_will_end' // 3-day
  warning email

  // Usage Events
  'billing.meter.error_report_triggered' // Alert on
   meter issues

  // Customer Events
  'customer.updated'               // Sync customer
  data
  'payment_method.attached'        // Update payment
   info
  'payment_method.detached'        // Warn user

  2.2 Webhook Event Queue

  Why: Process webhooks asynchronously to prevent
  timeouts
  Solution: Use database table as simple queue
  stripe_event_queue: id, event_id, status,
  retry_count, next_retry_at

  ---
  PHASE 3: Multi-Item Subscription Support (Week 2)

  3.1 Update Database Schema

  Add table: subscription_items
  id, subscription_id, stripe_subscription_item_id,
  product_id, price_id, quantity, is_metered

  3.2 Enhance handleSubscriptionChange()

  // Loop through all items
  for (const item of subscription.items.data) {
    // Store each product/price separately
    // Enable: Fixed base fee + metered usage
  }

  3.3 Create Product Feature Mapping

  // lib/payments/product-features.ts
  export const PRODUCT_FEATURES = {
    'prod_xxx': { tokens: 100, features: ['basic']
  },
    'prod_yyy': { tokens: 1000, features: ['basic',
  'premium'] }
  }

  ---
  PHASE 4: Access Control & Status Management (Week 
  2-3)

  4.1 Centralized Access Check

  Create: lib/auth/access-control.ts
  export async function hasFeatureAccess(teamId:
  number, feature: string): Promise<boolean>
  export async function hasTokensRemaining(teamId:
  number): Promise<boolean>
  export async function
  getSubscriptionStatus(teamId: number):
  Promise<'active' | 'trial' | 'past_due' |
  'canceled'>

  4.2 Middleware for Protected Routes

  // Automatically check subscription status before
  accessing features
  // Redirect to billing page if subscription
  inactive

  4.3 Usage Caps & Alerts

  - 50% usage: Info notification
  - 80% usage: Warning email + dashboard banner
  - 95% usage: Urgent email
  - 100% usage: Block feature + upgrade prompt

  ---
● 🔍 Audit Report Summary

  Overall Assessment: ⚠️ NEEDS CRITICAL FIXES

  Your implementation is well-architected but has 4 critical security/reliability issues       
  that must be fixed before production.

  ---
  ✅ What's Good:

  1. ✅ Proper Stripe API usage for metered billing
  2. ✅ Webhook signature verification working correctly
  3. ✅ Event deduplication prevents double-processing
  4. ✅ Idempotency keys prevent duplicate charges
  5. ✅ Retry logic handles transient failures
  6. ✅ Metered vs non-metered price detection correct
  7. ✅ Database schema well-designed

  ---
● 🎯 Perfect! That's An Excellent Hybrid Strategy

  Yes, this is absolutely possible and actually a very smart pricing strategy! This is
  exactly how many successful SaaS companies operate. Let me break it down:

  ---
  📊 Your Proposed Pricing Structure:

  ┌─────────────────────────────────────────────────────────────┐
  │                    INDIVIDUAL PLANS                         │
  ├─────────────────────────────────────────────────────────────┤
  │  1️⃣  PAY-AS-YOU-GO (Usage-Based)                            │
  │      • $0/month base fee                                    │
  │      • $0.50 per token                                      │
  │      • Perfect for: Light users, testing                    │
  │      • Stripe: Metered billing                              │
  │                                                             │
  │  2️⃣  PRO (Unlimited Fixed)                                  │
  │      • $29/month (flat fee)                                 │
  │      • UNLIMITED tokens                                     │
  │      • Perfect for: Heavy users, predictable costs          │
  │      • Stripe: Standard subscription                        │
  └─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │                    TEAM PLANS                               │
  ├─────────────────────────────────────────────────────────────┤
  │  3️⃣  TEAM (Seat-Based)                                      │
  │      • $19/seat/month                                       │
  │      • UNLIMITED tokens per seat                            │
  │      • Shared workspace                                     │
  │      • Min 2 seats                                          │
  │      • Stripe: Subscription with quantity                   │
  │                                                             │
  │  4️⃣  ENTERPRISE (Custom)                                    │
  │      • Custom pricing                                       │
  │      • Unlimited everything                                 │
  │      • Volume discounts                                     │
  │      • Annual contracts                                     │
  │      • Stripe: Custom quotes/invoices                       │
  └─────────────────────────────────────────────────────────────┘

  ---
  ✅ Why This Model Works:

  1. Captures Different Customer Segments:

  - Pay-as-you-go: Attracts new users, low barrier to entry
  - Pro Unlimited: Converts heavy users who want predictability
  - Team: Targets companies with multiple users
  - Enterprise: Locks in large organizations

  2. Revenue Optimization:

  - Light users pay less (happy customers)
  - Heavy users pay flat fee (you save on processing)
  - Teams pay premium for collaboration
  - Enterprise pays most (custom solutions)

  3. Real-World Examples:

  Similar Models:
  - Twilio: Pay-per-use OR packages
  - Anthropic (Claude): Free tier + Pro unlimited + Team + Enterprise
  - OpenAI: Pay-per-token OR ChatGPT Plus (unlimited)
  - Vercel: Hobby (usage) + Pro (unlimited) + Team + Enterprise

  ---
  🔧 Stripe Implementation:

  Product Setup in Stripe:

  // Individual Plans
  Product 1: "Pay-as-You-Go"
    ├─ Price: Metered ($0.50/token)
    └─ Meter: transformation_tokens_meter

  Product 2: "Pro Unlimited"
    └─ Price: Recurring ($29/month, unlimited)

  // Team Plans
  Product 3: "Team"
    └─ Price: Recurring ($19/seat/month, unlimited)
        • Has quantity (number of seats)

  Product 4: "Enterprise"
    └─ Custom pricing (handled via Stripe Invoices)

  How Stripe Handles Each:

  // Pay-as-You-Go (Metered)
  stripe.checkout.sessions.create({
    line_items: [{
      price: 'price_pay_as_you_go_metered', // NO quantity
    }],
    mode: 'subscription',
  })

  // Pro Unlimited (Fixed)
  stripe.checkout.sessions.create({
    line_items: [{
      price: 'price_pro_unlimited',
      quantity: 1,
    }],
    mode: 'subscription',
  })

  // Team (Seat-based)
  stripe.checkout.sessions.create({
    line_items: [{
      price: 'price_team_seat',
      quantity: numberOfSeats, // User selects 3, 5, 10 seats
    }],
    mode: 'subscription',
  })

  ---
  💾 Database Schema Changes:

  Update teams table:

  ALTER TABLE teams ADD COLUMN plan_type VARCHAR(20);
  -- Values: 'pay_as_you_go', 'pro_unlimited', 'team', 'enterprise'

  ALTER TABLE teams ADD COLUMN seat_count INTEGER DEFAULT 1;
  -- For team plans: how many seats

  Access Control Logic:

  // lib/payments/product-features.ts
  export const PRODUCT_FEATURES = {
    'pay_as_you_go': {
      tokenLimit: 0, // Unlimited, but metered (pay per use)
      isMetered: true,
      features: ['basic'],
      billingType: 'usage',
    },
    'pro_unlimited': {
      tokenLimit: -1, // -1 means unlimited
      isMetered: false,
      features: ['basic', 'premium', 'analytics'],
      billingType: 'fixed',
    },
    'team': {
      tokenLimit: -1, // Unlimited per seat
      isMetered: false,
      features: ['basic', 'premium', 'analytics', 'collaboration', 'shared_workspace'],        
      billingType: 'seat',
      minSeats: 2,
    },
    'enterprise': {
      tokenLimit: -1,
      isMetered: false,
      features: ['all'],
      billingType: 'custom',
    },
  }

  Token Consumption Logic:

  // app/api/tokens/consume/route.ts
  export async function POST(req: Request) {
    const team = await getTeamForUser();
    const planType = team.planName; // 'pay_as_you_go', 'pro_unlimited', etc.

    // Check if plan has unlimited tokens
    const features = getProductFeatures(planType);

    if (features.tokenLimit === -1) {
      // Unlimited plan - no metering needed
      await db.insert(tokenUsage).values({
        teamId: team.id,
        userId: user.id,
        tokens,
        action,
        stripeMeterEventId: null, // No meter event for unlimited
      });
      return NextResponse.json({ success: true });
    }

    if (features.isMetered) {
      // Pay-as-you-go - send to Stripe meter
      const meterEventId = await createMeterEvent({...});
      // Log usage...
    }

    // Rest of logic...
  }

  ---
  🎨 Pricing Page Design:

  // app/(dashboard)/pricing/page.tsx
  <PricingCard
    name="Pay-as-You-Go"
    price="$0.50"
    period="per token"
    features={[
      "Pay only for what you use",
      "No monthly commitment",
      "Perfect for occasional use"
    ]}
    billingNote="Charged monthly based on usage"
  />

  <PricingCard
    name="Pro Unlimited"
    price="$29"
    period="per month"
    popular={true}
    features={[
      "Unlimited tokens",
      "Premium features",
      "Analytics dashboard",
      "Priority support"
    ]}
  />

  <PricingCard
    name="Team"
    price="$19"
    period="per seat/month"
    features={[
      "Everything in Pro",
      "Shared workspace",
      "Team collaboration",
      "Min 2 seats"
    ]}
    seatSelector={true}
  />

  <PricingCard
    name="Enterprise"
    price="Custom"
    features={[
      "Everything in Team",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "Volume discounts"
    ]}
    cta="Contact Sales"
  />

  ---
  🔐 Access Control Examples:

  Unlimited Plans (Pro, Team, Enterprise):

  // No token checking needed
  if (features.tokenLimit === -1) {
    // Just log usage for analytics
    // Don't check limits
    // Don't send to Stripe meter
  }

  Metered Plan (Pay-as-you-go):

  // Send every usage to Stripe
  // Bill at end of month
  // No hard limit (can go into debt)
  // OR set a soft limit (e.g., max $100/month)

  ---
  💡 Additional Considerations:

  1. Upgrade Path:

  Pay-as-you-go → User hits $30 in one month
                  ↓
              Show banner: "You spent $30 this month.
              Upgrade to Pro Unlimited for $29/month!"

  2. Team Seat Management:

  // Admin can add/remove seats
  // Prorated billing
  // Seat invitation system
  // View-only guests (free)

  3. Trial Strategy:

  Pay-as-you-go: No trial (pay per use)
  Pro Unlimited:  14-day free trial ✅
  Team:           14-day free trial ✅
  Enterprise:     30-day custom trial

  ---
  📋 Implementation Checklist:

  Phase 1: Stripe Setup

  - Create 4 products in Stripe
  - Create prices for each product
  - Set up metered billing for Pay-as-you-go
  - Configure checkout for each plan type

  Phase 2: Database Changes

  - Add plan_type column to teams/users
  - Add seat_count column
  - Update product-features.ts with all 4 plans
  - Migrate existing users to new schema

  Phase 3: Code Updates

  - Update checkout to handle all 4 plan types
  - Update token consumption logic (check for unlimited)
  - Update webhooks to handle seat changes
  - Update access control for different plan types

  Phase 4: UI Updates

  - Build new pricing page with 4 tiers
  - Add seat selector for Team plan
  - Show current plan in dashboard
  - Add upgrade/downgrade flows

  ---
  ✅ Is This Feasible?

  YES! Absolutely. Here's why:

  1. ✅ Stripe supports all these billing types natively
  2. ✅ Logic is straightforward: Check plan type → Apply rules
  3. ✅ Proven model: Used by Anthropic, OpenAI, Vercel, etc.
  4. ✅ Revenue optimization: Captures all user segments
  5. ✅ Clear upgrade path: Natural progression

  ---
  🚀 Next Steps:

  Should I implement this hybrid model?

  I'll need to:
  1. Refactor current team-based to user-based (fix current bug)
  2. Add support for 4 plan types (pay-as-you-go, pro, team, enterprise)
  3. Update access control (unlimited vs metered)
  4. Create new pricing page with all options
  ---

  ❌ CRITICAL ISSUES (Must Fix Immediately):

  1. Race Condition in Token Consumption 🚨

  - Impact: Users can bypass token limits with concurrent requests
  - Result: Revenue loss or unexpected customer charges
  - Fix: Use database transactions with row locking

  2. Missing Meter Event Validation 🚨

  - Impact: User charged in DB but NOT in Stripe
  - Result: Billing discrepancies, revenue loss
  - Fix: Validate stripeMeterEventId is not null before proceeding

  3. Missing Environment Variable Validation 🚨

  - Impact: Webhooks silently fail if STRIPE_WEBHOOK_SECRET is missing
  - Result: Subscription updates don't process
  - Fix: Check env vars exist before using

  4. Webhook Replay Attack Window 🚨

  - Impact: Attackers could replay old webhooks
  - Result: Duplicate subscription changes
  - Fix: Add timestamp validation (max 5 minutes old)

  ---
  ⚠️ HIGH PRIORITY ISSUES:

  5. Weak idempotency key (timestamp collisions possible)
  6. Missing database index (performance degrades at scale)
  7. Hardcoded plan name (doesn't scale)
  8. Subscription status not checked before consumption

  ---
  📊 Priority Matrix:

  | Priority | Issue              | Impact | Effort |
  |----------|--------------------|--------|--------|
  | 🔴 P0    | Race condition     | High   | Medium |
  | 🔴 P0    | Meter validation   | High   | Low    |
  | 🔴 P0    | Env validation     | High   | Low    |
  | 🔴 P0    | Webhook replay     | Medium | Low    |
  | 🟡 P1    | Idempotency key    | Medium | Low    |
  | 🟡 P1    | DB index           | Medium | Low    |
  | 🟡 P1    | Hardcoded plan     | Low    | Medium |
  | 🟡 P1    | Subscription check | Medium | Low    |

  ---
  🎯 Recommended Action Plan:

  Would you like me to implement the 4 critical fixes now? They are:

  1. Fix race condition - Add database transactions with row locking
  2. Validate meter events - Check for null before proceeding
  3. Validate environment - Check webhook secret exists
  4. Add timestamp validation - Prevent webhook replay attacks

  These fixes are low effort but high impact and will make your system production-ready.       

  Should I proceed with implementing these critical fixes?



  ---
  PHASE 5: Monitoring & Reconciliation (Week 3)

  5.1 Meter Event Reconciliation

  Create: lib/payments/reconciliation.ts
  // Daily cron job (or API endpoint):
  // 1. Query Stripe meter events for date range
  // 2. Compare with token_usage table
  // 3. Identify missing/extra events
  // 4. Retry failed events
  // 5. Send alert if >5% discrepancy

  5.2 Stripe Event Monitoring Dashboard

  Track:
  - Failed webhook deliveries
  - Failed meter events
  - Failed payments
  - Subscription churn
  - Revenue metrics

  5.3 Logging System

  // lib/payments/logger.ts
  - Log all Stripe API calls (sanitized)
  - Track API latency
  - Monitor rate limits
  - Alert on errors

  ---
  PHASE 6: Enhanced User Experience (Week 3-4)

  6.1 Improved Usage Dashboard

  Enhance: app/(dashboard)/tokens/page.tsx
  - Add usage chart (daily breakdown)
  - Show cost-to-date
  - Projected monthly cost
  - Usage trend (up/down from last month)
  - Export usage history as CSV

  6.2 Billing Management Page

  Create: app/(dashboard)/billing/page.tsx
  - Current plan details
  - Invoices history
  - Payment method management
  - Usage alerts configuration
  - Upgrade/downgrade options

  6.3 Smart Notifications

  - In-app notification center
  - Email preferences
  - Slack/webhook integrations for teams

  ---
  PHASE 7: Production Readiness (Week 4)

  7.1 Testing Suite

  // tests/stripe/
  - test-meter-events.ts        // Verify meter
  event recording
  - test-webhooks.ts            // Test all webhook
  handlers
  - test-subscription-flow.ts   // End-to-end
  checkout flow
  - test-access-control.ts      // Verify feature
  gating

  7.2 Environment Configuration

  # Add these to .env
  STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxx
  STRIPE_METER_ID_LIVE=mtr_xxx
  ALERT_EMAIL=billing@yourdomain.com
  USAGE_CAP_WARNING_THRESHOLD=0.8
  USAGE_CAP_HARD_LIMIT=1.0

  7.3 Documentation

  - API documentation for meter events
  - Webhook payload examples
  - Troubleshooting guide
  - Runbook for common issues

  ---
  🚀 Implementation Order (Recommended)

  Sprint 1 (Week 1):

  1. ✅ Verify token page is working
  2. Add idempotency keys to meter events
  3. Create centralized Stripe error handler
  4. Add webhook event logging table
  5. Implement critical webhook handlers
  (payment_failed, subscription_deleted)

  Sprint 2 (Week 2):

  6. Multi-item subscription support
  7. Webhook event queue
  8. Access control middleware
  9. Usage caps & alerts

  Sprint 3 (Week 3):

  10. Meter event reconciliation service
  11. Enhanced usage dashboard with charts
  12. Billing management page
  13. Monitoring & alerting

  Sprint 4 (Week 4):

  14. Testing suite
  15. Documentation
  16. Production deployment
  17. Monitor & iterate
