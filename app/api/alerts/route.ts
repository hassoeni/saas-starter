import { NextResponse } from 'next/server';
import { getTeamForUser } from '@/lib/db/queries';
import { getActiveAlerts, acknowledgeAlert } from '@/lib/payments/usage-alerts';

/**
 * GET /api/alerts
 * Get active usage alerts for the current team
 */
export async function GET() {
  try {
    const team = await getTeamForUser();

    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alerts = await getActiveAlerts(team.id);

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

/**
 * POST /api/alerts/acknowledge
 * Mark an alert as acknowledged
 */
export async function POST(req: Request) {
  try {
    const team = await getTeamForUser();

    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertId } = await req.json();

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
    }

    await acknowledgeAlert(alertId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json({ error: 'Failed to acknowledge alert' }, { status: 500 });
  }
}
