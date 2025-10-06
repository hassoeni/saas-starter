'use client';

import { useEffect, useState } from 'react';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Alert {
  id: number;
  alertType: string;
  usagePercentage: number;
  tokensUsed: number;
  tokensLimit: number;
  threshold?: {
    type: string;
    percentage: number;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'urgent' | 'critical';
  };
}

export function UsageAlertBanner() {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();

      if (data.alerts && data.alerts.length > 0) {
        // Show the most severe alert
        setAlert(data.alerts[0]);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }

  async function handleDismiss() {
    if (!alert) return;

    setDismissed(true);

    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: alert.id }),
      });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  }

  if (!alert || dismissed || !alert.threshold) {
    return null;
  }

  const severity = alert.threshold.severity;

  const severityConfig = {
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-900',
      icon: Info,
      iconColor: 'text-blue-500',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-900',
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
    },
    urgent: {
      bg: 'bg-orange-50 border-orange-200',
      text: 'text-orange-900',
      icon: AlertCircle,
      iconColor: 'text-orange-500',
    },
    critical: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-900',
      icon: AlertCircle,
      iconColor: 'text-red-500',
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} border ${config.text} px-4 py-3 rounded-lg mb-6 flex items-start gap-3`}
    >
      <Icon className={`${config.iconColor} mt-0.5 flex-shrink-0`} size={20} />
      <div className="flex-1">
        <h3 className="font-semibold text-sm mb-1">{alert.threshold.title}</h3>
        <p className="text-sm mb-2">{alert.threshold.message}</p>
        <p className="text-xs opacity-75">
          Tokens used: {alert.tokensUsed} / {alert.tokensLimit} ({alert.usagePercentage}%)
        </p>
        {severity === 'critical' && (
          <Button
            size="sm"
            className="mt-3 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => (window.location.href = '/pricing')}
          >
            Upgrade Plan
          </Button>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className={`${config.text} hover:opacity-70 flex-shrink-0`}
        aria-label="Dismiss alert"
      >
        <X size={18} />
      </button>
    </div>
  );
}
