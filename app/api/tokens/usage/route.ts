import { NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { tokenUsage } from '@/lib/db/schema';
import { desc, eq, sql, and, gte } from 'drizzle-orm';
import { getTokenLimit } from '@/lib/payments/product-features';

export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();

    // Get total tokens used this month for this user
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfMonthISO = firstDayOfMonth.toISOString();

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

    // Get recent usage history for this user
    const recentUsage = await db
      .select()
      .from(tokenUsage)
      .where(eq(tokenUsage.userId, user.id))
      .orderBy(desc(tokenUsage.createdAt))
      .limit(20);

    // Manually serialize each field to avoid Date issues
    const serializedUsage = recentUsage.map((usage) => {
      const result: any = {
        id: usage.id,
        teamId: usage.teamId,
        userId: usage.userId,
        tokens: usage.tokens,
        action: usage.action,
        stripeMeterEventId: usage.stripeMeterEventId || null,
        metadata: usage.metadata || null,
      };

      // Handle createdAt date carefully
      if (usage.createdAt instanceof Date) {
        result.createdAt = usage.createdAt.toISOString();
      } else if (typeof usage.createdAt === 'string') {
        result.createdAt = usage.createdAt;
      } else {
        result.createdAt = new Date().toISOString();
      }

      return result;
    });

    // Determine plan type (user plan takes priority over team plan)
    const planType = user.planType || team?.planType;
    const tokenLimit = getTokenLimit(planType);

    const response = {
      monthlyTotal: Number(monthlyUsage[0]?.total || 0),
      tokenLimit,
      planType,
      recentUsage: serializedUsage,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching token usage:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch usage' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
