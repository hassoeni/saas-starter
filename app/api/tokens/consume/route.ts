import { NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { tokenUsage } from '@/lib/db/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import { createMeterEvent } from '@/lib/payments/stripe-utils';
import { getTokenLimit, isMeteredPlanType } from '@/lib/payments/product-features';
import { hasUnlimitedTokens } from '@/lib/payments/plans';
import { checkAndTriggerAlerts, sendAlertEmail } from '@/lib/payments/usage-alerts';

export async function POST(req: Request) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, tokens = 1, metadata } = await req.json();

    // Determine user's plan type - check user first, then team
    const team = await getTeamForUser();
    const planType = user.planType || team?.planType;

    if (!planType) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 403 }
      );
    }

    // Check if user has unlimited tokens - if so, skip all limit checks
    if (hasUnlimitedTokens(planType)) {
      // Just log usage for analytics, no limits enforced
      await db.insert(tokenUsage).values({
        userId: user.id,
        teamId: team?.id || null,
        tokens,
        action,
        stripeMeterEventId: null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });

      return NextResponse.json({
        success: true,
        tokens,
        action,
        unlimited: true,
      });
    }

    // For pay-as-you-go (metered) plans, report to Stripe
    let stripeMeterEventId = null;
    if (isMeteredPlanType(planType) && user.stripeCustomerId) {
      const timestamp = Date.now();
      const idempotencyKey = `token-${user.id}-${timestamp}`;

      stripeMeterEventId = await createMeterEvent({
        eventName: 'transformationtokensmeter',
        customerId: user.stripeCustomerId,
        value: tokens.toString(),
        idempotencyKey,
      });
    }

    // Check current month usage for plans with limits
    const tokenLimit = getTokenLimit(planType);
    if (tokenLimit > 0) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyUsage = await db
        .select({
          total: sql<number>`COALESCE(SUM(${tokenUsage.tokens}), 0)`,
        })
        .from(tokenUsage)
        .where(
          and(
            eq(tokenUsage.userId, user.id),
            gte(tokenUsage.createdAt, firstDayOfMonth)
          )
        );

      const currentUsage = monthlyUsage[0]?.total || 0;

      if (currentUsage >= tokenLimit) {
        return NextResponse.json(
          { error: 'Token limit reached for this month' },
          { status: 429 }
        );
      }

      // Check and trigger usage alerts (async, don't block response)
      if (team) {
        checkAndTriggerAlerts(team.id, planType)
          .then((triggeredAlerts) => {
            triggeredAlerts.forEach((alert) => {
              if (alert.sendEmail) {
                const newUsage = currentUsage + tokens;
                sendAlertEmail(
                  0,
                  team.id,
                  alert,
                  newUsage,
                  tokenLimit
                ).catch((err) => console.error('Failed to send alert email:', err));
              }
            });
          })
          .catch((err) => console.error('Failed to check usage alerts:', err));
      }
    }

    // Log usage to database
    await db.insert(tokenUsage).values({
      userId: user.id,
      teamId: team?.id || null,
      tokens,
      action,
      stripeMeterEventId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    return NextResponse.json({
      success: true,
      tokens,
      action,
    });
  } catch (error) {
    console.error('Error consuming tokens:', error);
    return NextResponse.json(
      { error: 'Failed to consume tokens' },
      { status: 500 }
    );
  }
}
