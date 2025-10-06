'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsageAlertBanner } from '@/components/usage-alert-banner';
import useSWR, { mutate } from 'swr';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TokensPage() {
  const { data: usageData, isLoading } = useSWR('/api/tokens/usage', fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds
  });

  const [consuming, setConsuming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function consumeToken() {
    setConsuming(true);
    setError(null);
    try {
      const response = await fetch('/api/tokens/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'demo_button_click',
          tokens: 1,
          metadata: { source: 'dashboard' },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to consume token');
      } else {
        // Refresh usage data
        mutate('/api/tokens/usage');
      }
    } catch (error) {
      console.error('Error consuming token:', error);
      setError('An unexpected error occurred');
    }
    setConsuming(false);
  }

  if (isLoading) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <h1 className="text-lg lg:text-2xl font-medium mb-6">Token Usage</h1>
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
        </div>
      </section>
    );
  }

  const monthlyTotal = usageData?.monthlyTotal || 0;
  const tokenLimit = usageData?.tokenLimit || 0;
  const planType = usageData?.planType;

  // Handle unlimited plans (-1) and metered plans (0)
  const isUnlimited = tokenLimit === -1;
  const isMetered = tokenLimit === 0;
  const hasLimit = tokenLimit > 0;

  const remainingTokens = hasLimit ? Math.max(0, tokenLimit - monthlyTotal) : 0;
  const percentUsed = hasLimit ? Math.min(100, (monthlyTotal / tokenLimit) * 100) : 0;

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg lg:text-2xl font-medium">Token Usage</h1>
        {planType && (
          <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {planType === 'pay_as_you_go' && 'Pay as You Go'}
            {planType === 'pro_unlimited' && 'Pro Unlimited'}
            {planType === 'team' && 'Team'}
            {planType === 'enterprise' && 'Enterprise'}
          </div>
        )}
      </div>

      <UsageAlertBanner />

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isUnlimited ? (
                <div className="pt-4">
                  <p className="text-3xl font-bold">∞</p>
                  <p className="text-sm text-muted-foreground">Unlimited Tokens</p>
                  <p className="text-xs text-gray-500 mt-2">You have used {monthlyTotal} tokens this month</p>
                </div>
              ) : isMetered ? (
                <div className="pt-4">
                  <p className="text-3xl font-bold">{monthlyTotal}</p>
                  <p className="text-sm text-muted-foreground">Tokens Used (Pay-as-you-go)</p>
                  <p className="text-xs text-gray-500 mt-2">Charged at $0.50 per token</p>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Tokens Used</span>
                      <span className="text-sm font-medium">
                        {monthlyTotal} / {tokenLimit}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          percentUsed > 90
                            ? 'bg-red-500'
                            : percentUsed > 75
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-4">
                    <p className="text-3xl font-bold">{remainingTokens}</p>
                    <p className="text-sm text-muted-foreground">Tokens Remaining</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo: Consume Token</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the button below to consume 1 token. This simulates a real usage event
                and reports to Stripe's billing meter.
              </p>
              <Button
                onClick={consumeToken}
                disabled={consuming || (!isUnlimited && !isMetered && remainingTokens === 0)}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
              >
                {consuming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Consuming...
                  </>
                ) : (!isUnlimited && !isMetered && remainingTokens === 0) ? (
                  'No Tokens Remaining'
                ) : (
                  'Use 1 Token'
                )}
              </Button>
              {error && (
                <p className="text-xs text-center text-red-600 mt-2">
                  {error}
                </p>
              )}
              {monthlyTotal > 0 && !error && (
                <p className="text-xs text-center text-muted-foreground">
                  Last action: {new Date(usageData.recentUsage[0]?.createdAt).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          {!usageData?.recentUsage || usageData.recentUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No usage history yet. Click "Use 1 Token" to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {usageData.recentUsage.map((usage: any) => (
                <div
                  key={usage.id}
                  className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{usage.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(usage.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{usage.tokens} token{usage.tokens !== 1 ? 's' : ''}</p>
                    {usage.stripeMeterEventId && (
                      <p className="text-xs text-green-600">✓ Reported to Stripe</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
