'use client';

import { checkoutAction } from '@/lib/payments/actions';
import { Check, Loader2 } from 'lucide-react';
import { SubmitButton } from './submit-button';
import { useState, useEffect } from 'react';
import { PLANS } from '@/lib/payments/plans';

export default function PricingPage() {
  const [prices, setPrices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/stripe/prices');
        const data = await response.json();
        setPrices(data.prices || []);
        setProducts(data.products || []);
      } catch (error) {
        console.error('Failed to fetch Stripe data:', error);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-4 text-gray-600">Loading pricing...</p>
        </div>
      </main>
    );
  }

  // Match Stripe products to our plan config by name
  const getProductPrice = (productName: string) => {
    const product = products.find(p => p.name === productName);
    if (!product) return null;
    const price = prices.find(p => p.productId === product.id);
    return { product, price };
  };

  // Match your existing Stripe products
  const payAsYouGo = getProductPrice('Transformertokens');
  const proUnlimited = getProductPrice('Plus');
  const team = getProductPrice('Team'); // You'll need to create this
  const enterprise = getProductPrice('Enterprise');

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
        <p className="text-lg text-gray-600">Choose the plan that fits your needs</p>
      </div>

      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-2">Individual Plans</h2>
        <p className="text-center text-gray-600 mb-8">For personal use</p>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <PricingCard
            planType="pay_as_you_go"
            name={PLANS.pay_as_you_go.name}
            price={PLANS.pay_as_you_go.price}
            priceUnit="per token"
            description={PLANS.pay_as_you_go.description}
            features={PLANS.pay_as_you_go.features}
            priceId={payAsYouGo?.price?.id || ''}
            highlight={false}
            disabled={!payAsYouGo}
          />
          <PricingCard
            planType="pro_unlimited"
            name={PLANS.pro_unlimited.name}
            price={PLANS.pro_unlimited.price}
            priceUnit="per month"
            description={PLANS.pro_unlimited.description}
            features={PLANS.pro_unlimited.features}
            priceId={proUnlimited?.price?.id || ''}
            highlight={true}
            disabled={!proUnlimited}
          />
        </div>
      </div>

      <div className="border-t pt-12">
        <h2 className="text-2xl font-bold text-center mb-2">Team Plans</h2>
        <p className="text-center text-gray-600 mb-8">For teams and organizations</p>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <TeamPricingCard
            planType="team"
            name={PLANS.team.name}
            pricePerSeat={PLANS.team.price}
            description={PLANS.team.description}
            features={PLANS.team.features}
            priceId={team?.price?.id || ''}
            disabled={!team}
          />
          <PricingCard
            planType="enterprise"
            name={PLANS.enterprise.name}
            price={0}
            priceUnit="Custom pricing"
            description={PLANS.enterprise.description}
            features={PLANS.enterprise.features}
            priceId={enterprise?.price?.id || ''}
            highlight={false}
            customPrice={true}
            disabled={false}
          />
        </div>
      </div>
    </main>
  );
}

function PricingCard({
  planType,
  name,
  price,
  priceUnit,
  description,
  features,
  priceId,
  highlight = false,
  customPrice = false,
  disabled = false,
}: {
  planType: string;
  name: string;
  price: number;
  priceUnit: string;
  description: string;
  features: string[];
  priceId: string;
  highlight?: boolean;
  customPrice?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={`pt-6 rounded-lg p-6 relative ${
      highlight ? 'border-2 border-orange-500 shadow-lg' : 'border border-gray-200'
    }`}>
      {highlight && (
        <div className="absolute -top-3 right-4 bg-orange-500 text-white text-xs px-3 py-1 rounded-full">
          Popular
        </div>
      )}
      <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      {!customPrice ? (
        <p className="text-4xl font-bold text-gray-900 mb-6">
          ${price}{' '}
          <span className="text-xl font-normal text-gray-600">{priceUnit}</span>
        </p>
      ) : (
        <p className="text-2xl font-bold text-gray-900 mb-6">Contact Sales</p>
      )}
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700 text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      {!customPrice ? (
        disabled ? (
          <button
            disabled
            className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
          >
            Not Available - Create Stripe Product
          </button>
        ) : (
          <form action={checkoutAction}>
            <input type="hidden" name="planType" value={planType} />
            <input type="hidden" name="priceId" value={priceId} />
            <SubmitButton />
          </form>
        )
      ) : (
        <button
          className="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          onClick={() => window.location.href = 'mailto:sales@example.com'}
        >
          Contact Sales
        </button>
      )}
    </div>
  );
}

function TeamPricingCard({
  planType,
  name,
  pricePerSeat,
  description,
  features,
  priceId,
  disabled = false,
}: {
  planType: string;
  name: string;
  pricePerSeat: number;
  description: string;
  features: string[];
  priceId: string;
  disabled?: boolean;
}) {
  const [seats, setSeats] = useState(5);

  return (
    <div className="pt-6 border-2 border-orange-500 rounded-lg p-6 relative shadow-lg">
      <div className="absolute -top-3 right-4 bg-orange-500 text-white text-xs px-3 py-1 rounded-full">
        Best for Teams
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <div className="mb-6">
        <p className="text-4xl font-bold text-gray-900">
          ${pricePerSeat * seats}{' '}
          <span className="text-xl font-normal text-gray-600">/ month</span>
        </p>
        <p className="text-sm text-gray-600 mt-1">
          ${pricePerSeat} per seat × {seats} seats
        </p>
      </div>
      <div className="mb-6">
        <label htmlFor="seats" className="block text-sm font-medium text-gray-700 mb-2">
          Number of seats
        </label>
        <input
          type="number"
          id="seats"
          min="2"
          max="50"
          value={seats}
          onChange={(e) => setSeats(Math.max(2, Math.min(50, parseInt(e.target.value) || 2)))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-xs text-gray-500 mt-1">Minimum 2 seats, maximum 50 seats</p>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700 text-sm">{feature}</span>
          </li>
        ))}
      </ul>
      {disabled ? (
        <button
          disabled
          className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
        >
          Not Available - Create Stripe Product
        </button>
      ) : (
        <form action={checkoutAction}>
          <input type="hidden" name="planType" value={planType} />
          <input type="hidden" name="priceId" value={priceId} />
          <input type="hidden" name="quantity" value={seats} />
          <SubmitButton />
        </form>
      )}
    </div>
  );
}
