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
