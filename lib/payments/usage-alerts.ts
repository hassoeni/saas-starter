/**
 * Usage Alerts System
 *
 * Monitors token usage and triggers alerts at different thresholds
 */

import { db } from '../db/drizzle';
import { usageAlerts, tokenUsage } from '../db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { getTokenLimit } from './product-features';

export type AlertType = 'info_50' | 'warning_80' | 'urgent_95' | 'blocked_100';

export interface UsageAlertThreshold {
  type: AlertType;
  percentage: number;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent' | 'critical';
  sendEmail: boolean;
}

/**
 * Alert thresholds configuration
 */
export const ALERT_THRESHOLDS: UsageAlertThreshold[] = [
  {
    type: 'info_50',
    percentage: 50,
    title: 'Halfway There',
    message: 'You have used 50% of your monthly tokens. You are on track!',
    severity: 'info',
    sendEmail: false,
  },
  {
    type: 'warning_80',
    percentage: 80,
    title: 'Token Usage Warning',
    message: 'You have used 80% of your monthly tokens. Consider upgrading or monitoring your usage.',
    severity: 'warning',
    sendEmail: true,
  },
  {
    type: 'urgent_95',
    percentage: 95,
    title: 'Token Limit Almost Reached',
    message: 'You have used 95% of your monthly tokens. You are approaching your limit!',
    severity: 'urgent',
    sendEmail: true,
  },
  {
    type: 'blocked_100',
    percentage: 100,
    title: 'Token Limit Reached',
    message: 'You have reached your monthly token limit. Upgrade your plan to continue using tokens.',
    severity: 'critical',
    sendEmail: true,
  },
];

/**
 * Check if a team should receive an alert at a specific threshold
 */
export async function shouldTriggerAlert(
  teamId: number,
  alertType: AlertType,
  currentMonth: Date
): Promise<boolean> {
  // Check if alert already sent this month
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const firstDayISO = firstDayOfMonth.toISOString();

  const existingAlert = await db
    .select()
    .from(usageAlerts)
    .where(
      and(
        eq(usageAlerts.teamId, teamId),
        eq(usageAlerts.alertType, alertType),
        sql`${usageAlerts.createdAt} >= ${firstDayISO}::timestamp`
      )
    )
    .limit(1);

  return existingAlert.length === 0;
}

/**
 * Create a usage alert record
 */
export async function createUsageAlert(
  teamId: number,
  alertType: AlertType,
  usagePercentage: number,
  tokensUsed: number,
  tokensLimit: number
) {
  await db.insert(usageAlerts).values({
    teamId,
    alertType,
    usagePercentage,
    tokensUsed,
    tokensLimit,
    notificationSent: new Date(),
  });
}

/**
 * Mark alert email as sent
 */
export async function markEmailSent(alertId: number) {
  await db
    .update(usageAlerts)
    .set({ emailSent: new Date() })
    .where(eq(usageAlerts.id, alertId));
}

/**
 * Mark alert as acknowledged by user
 */
export async function acknowledgeAlert(alertId: number) {
  await db
    .update(usageAlerts)
    .set({ acknowledged: new Date() })
    .where(eq(usageAlerts.id, alertId));
}

/**
 * Check usage and trigger alerts if necessary
 */
export async function checkAndTriggerAlerts(
  teamId: number,
  planName: string | null
): Promise<UsageAlertThreshold[]> {
  const tokenLimit = getTokenLimit(planName);

  if (tokenLimit === 0) {
    return []; // No alerts for unlimited plans
  }

  // Get current month usage
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayISO = firstDayOfMonth.toISOString();

  const monthlyUsage = await db
    .select({
      total: sql<number>`COALESCE(SUM(${tokenUsage.tokens}), 0)`,
    })
    .from(tokenUsage)
    .where(eq(tokenUsage.teamId, teamId))
    .where(sql`${tokenUsage.createdAt} >= ${firstDayISO}::timestamp`);

  const tokensUsed = monthlyUsage[0]?.total || 0;
  const usagePercentage = Math.floor((tokensUsed / tokenLimit) * 100);

  const triggeredAlerts: UsageAlertThreshold[] = [];

  // Check each threshold
  for (const threshold of ALERT_THRESHOLDS) {
    if (usagePercentage >= threshold.percentage) {
      const shouldTrigger = await shouldTriggerAlert(teamId, threshold.type, now);

      if (shouldTrigger) {
        await createUsageAlert(teamId, threshold.type, usagePercentage, tokensUsed, tokenLimit);
        triggeredAlerts.push(threshold);
      }
    }
  }

  return triggeredAlerts;
}

/**
 * Get active (unacknowledged) alerts for a team
 */
export async function getActiveAlerts(teamId: number) {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayISO = firstDayOfMonth.toISOString();

  const alerts = await db
    .select()
    .from(usageAlerts)
    .where(
      and(
        eq(usageAlerts.teamId, teamId),
        sql`${usageAlerts.createdAt} >= ${firstDayISO}::timestamp`,
        sql`${usageAlerts.acknowledged} IS NULL`
      )
    )
    .orderBy(desc(usageAlerts.createdAt));

  return alerts.map((alert) => {
    const threshold = ALERT_THRESHOLDS.find((t) => t.type === alert.alertType);
    return {
      ...alert,
      threshold,
    };
  });
}

/**
 * Get the highest severity alert for display
 */
export async function getCurrentAlert(teamId: number) {
  const activeAlerts = await getActiveAlerts(teamId);

  if (activeAlerts.length === 0) {
    return null;
  }

  // Return the most severe alert (highest percentage)
  const sortedBySeverity = activeAlerts.sort(
    (a, b) => b.usagePercentage - a.usagePercentage
  );

  return sortedBySeverity[0];
}

/**
 * Send email notification for usage alert
 * TODO: Implement actual email sending
 */
export async function sendAlertEmail(
  alertId: number,
  teamId: number,
  alertThreshold: UsageAlertThreshold,
  tokensUsed: number,
  tokensLimit: number
) {
  // TODO: Integrate with your email service (e.g., SendGrid, Resend, AWS SES)
  console.log(`📧 Sending ${alertThreshold.severity} alert email:`, {
    alertId,
    teamId,
    type: alertThreshold.type,
    message: alertThreshold.message,
    tokensUsed,
    tokensLimit,
  });

  // Mark email as sent
  await markEmailSent(alertId);

  // Example implementation with a hypothetical email service:
  /*
  const emailContent = {
    to: teamEmail,
    subject: alertThreshold.title,
    html: `
      <h2>${alertThreshold.title}</h2>
      <p>${alertThreshold.message}</p>
      <p>Tokens used: ${tokensUsed} / ${tokensLimit}</p>
      <a href="${process.env.BASE_URL}/tokens">View Usage</a>
    `,
  };
  await emailService.send(emailContent);
  await markEmailSent(alertId);
  */
}
