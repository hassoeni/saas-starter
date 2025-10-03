import { NextResponse } from 'next/server';
import { getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { tokenUsage } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const team = await getTeamForUser();

    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total tokens used this month
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

    // Get recent usage history
    const recentUsage = await db
      .select()
      .from(tokenUsage)
      .where(eq(tokenUsage.teamId, team.id))
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

    const response = {
      monthlyTotal: Number(monthlyUsage[0]?.total || 0),
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
