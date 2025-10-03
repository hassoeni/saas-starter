import { NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { tokenUsage } from '@/lib/db/schema';
import { stripe } from '@/lib/payments/stripe';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const user = await getUser();
    const team = await getTeamForUser();

    if (!user || !team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, tokens = 1, metadata } = await req.json();

    // Check current month usage
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfMonthISO = firstDayOfMonth.toISOString();
    const monthlyUsage = await db
      .select({
        total: sql<number>`COALESCE(SUM(${tokenUsage.tokens}), 0)`,
      })
      .from(tokenUsage)
      .where(eq(tokenUsage.teamId, team.id))
      .where(sql`${tokenUsage.createdAt} >= ${firstDayOfMonthISO}::timestamp`);

    const currentUsage = monthlyUsage[0]?.total || 0;
    const tokenLimit = 100; // Should match your Stripe plan

    if (currentUsage >= tokenLimit) {
      return NextResponse.json(
        { error: 'Token limit reached for this month' },
        { status: 429 }
      );
    }

    // Only report to Stripe if team has Token Plan subscription
    let stripeMeterEventId = null;
    if (team.stripeCustomerId && team.planName === 'Transformertokens') {
      try {
        const meterEvent = await stripe.billing.meterEvents.create({
          event_name: 'transformationtokensmeter',
          payload: {
            stripe_customer_id: team.stripeCustomerId,
            value: tokens.toString(),
          },
        });
        stripeMeterEventId = meterEvent.identifier;
      } catch (error) {
        console.error('Error reporting to Stripe meter:', error);
        // Continue even if Stripe reporting fails
      }
    }

    // Log usage to database
    await db.insert(tokenUsage).values({
      teamId: team.id,
      userId: user.id,
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
