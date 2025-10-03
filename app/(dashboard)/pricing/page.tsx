'use client';

import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { SubmitButton } from './submit-button';
import { useState, useEffect } from 'react';

export default function PricingPage() {
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [prices, setPrices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch('/api/stripe/prices');
      const data = await response.json();
      setPrices(data.prices);
      setProducts(data.products);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">Loading...</div>
      </main>
    );
  }

  const basePlan = products.find((product) => product.name === 'Base');
  const plusPlan = products.find((product) => product.name === 'Plus');
  const enterprisePlan = products.find((product) => product.name === 'Enterprise');
  const tokenPlan = products.find((product) => product.name === 'Transformertokens');

  const basePrice = prices.find(
    (price) => price.productId === basePlan?.id && price.interval === interval
  );
  const plusPrice = prices.find(
    (price) => price.productId === plusPlan?.id && price.interval === interval
  );
  const enterprisePrice = prices.find(
    (price) => price.productId === enterprisePlan?.id && price.interval === interval
  );
  const tokenPrice = prices.find(
    (price) => price.productId === tokenPlan?.id && price.interval === 'month'
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setInterval('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              interval === 'month'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('year')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              interval === 'year'
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold text-center mb-2">Subscription Plans</h2>
        <p className="text-center text-gray-600 mb-8">Choose the plan that fits your needs</p>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <PricingCard
            name={basePlan?.name || 'Base'}
            price={basePrice?.unitAmount || 800}
            interval={basePrice?.interval || 'month'}
            trialDays={basePrice?.trialPeriodDays || 7}
            features={[
              'Unlimited Usage',
              'Unlimited Workspace Members',
              'Email Support',
            ]}
            priceId={basePrice?.id}
          />
          <PricingCard
            name={plusPlan?.name || 'Plus'}
            price={plusPrice?.unitAmount || 1200}
            interval={plusPrice?.interval || 'month'}
            trialDays={plusPrice?.trialPeriodDays || 7}
            features={[
              'Everything in Base, and:',
              'Early Access to New Features',
              '24/7 Support + Slack Access',
            ]}
            priceId={plusPrice?.id}
          />
          <PerSeatPricingCard
            name={enterprisePlan?.name || 'Enterprise'}
            pricePerSeat={enterprisePrice?.unitAmount || 1000}
            interval={enterprisePrice?.interval || 'month'}
            trialDays={enterprisePrice?.trialPeriodDays || 7}
            features={[
              'Everything in Plus, and:',
              'Dedicated Account Manager',
              'Custom Integrations',
              'SLA Guarantee',
            ]}
            priceId={enterprisePrice?.id}
          />
        </div>
      </div>

      <div className="border-t pt-12">
        <h2 className="text-2xl font-bold text-center mb-2">Usage-Based Plan</h2>
        <p className="text-center text-gray-600 mb-8">Pay only for what you use</p>
        <div className="max-w-md mx-auto">
          <TokenPricingCard
            name="Token Plan"
            basePrice={tokenPrice?.unitAmount || 5000}
            includedTokens={100}
            interval="month"
            trialDays={tokenPrice?.trialPeriodDays || 7}
            features={[
              '100 tokens included per month',
              'Usage-based billing',
              'Real-time usage tracking',
              'Monthly billing cycle',
            ]}
            priceId={tokenPrice?.id}
          />
        </div>
      </div>
    </main>
  );
}

function PricingCard({
  name,
  price,
  interval,
  trialDays,
  features,
  priceId,
}: {
  name: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
}) {
  return (
    <div className="pt-6">
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      <p className="text-sm text-gray-600 mb-4">
        with {trialDays} day free trial
      </p>
      <p className="text-4xl font-medium text-gray-900 mb-6">
        ${price / 100}{' '}
        <span className="text-xl font-normal text-gray-600">
          per user / {interval}
        </span>
      </p>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <form action={checkoutAction}>
        <input type="hidden" name="priceId" value={priceId} />
        <SubmitButton />
      </form>
    </div>
  );
}

function PerSeatPricingCard({
  name,
  pricePerSeat,
  interval,
  trialDays,
  features,
  priceId,
}: {
  name: string;
  pricePerSeat: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
}) {
  const [seats, setSeats] = useState(5);

  return (
    <div className="pt-6 border-2 border-orange-500 rounded-lg p-6 relative">
      <div className="absolute -top-3 right-4 bg-orange-500 text-white text-xs px-3 py-1 rounded-full">
        Popular
      </div>
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      <p className="text-sm text-gray-600 mb-4">
        with {trialDays} day free trial
      </p>
      <div className="mb-6">
        <p className="text-4xl font-medium text-gray-900">
          ${(pricePerSeat / 100) * seats}{' '}
          <span className="text-xl font-normal text-gray-600">/ {interval}</span>
        </p>
        <p className="text-sm text-gray-600 mt-1">
          ${pricePerSeat / 100} per seat × {seats} seats
        </p>
      </div>
      <div className="mb-6">
        <label htmlFor="seats" className="block text-sm font-medium text-gray-700 mb-2">
          Number of seats
        </label>
        <input
          type="number"
          id="seats"
          min="1"
          max="1000"
          value={seats}
          onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <form action={checkoutAction}>
        <input type="hidden" name="priceId" value={priceId} />
        <input type="hidden" name="quantity" value={seats} />
        <SubmitButton />
      </form>
    </div>
  );
}

function TokenPricingCard({
  name,
  basePrice,
  includedTokens,
  interval,
  trialDays,
  features,
  priceId,
}: {
  name: string;
  basePrice: number;
  includedTokens: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
}) {
  return (
    <div className="pt-6 border-2 border-blue-500 rounded-lg p-6 relative bg-blue-50">
      <div className="absolute -top-3 right-4 bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
        Usage-Based
      </div>
      <h2 className="text-2xl font-medium text-gray-900 mb-2">{name}</h2>
      <p className="text-sm text-gray-600 mb-4">
        with {trialDays} day free trial
      </p>
      <div className="mb-6">
        <p className="text-4xl font-medium text-gray-900">
          ${basePrice / 100}{' '}
          <span className="text-xl font-normal text-gray-600">/ {interval}</span>
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Includes {includedTokens} tokens
        </p>
      </div>
      <ul className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <form action={checkoutAction}>
        <input type="hidden" name="priceId" value={priceId} />
        <SubmitButton />
      </form>
    </div>
  );
}
