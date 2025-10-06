'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { customerPortalAction } from '@/lib/payments/actions';
import { useActionState, useState } from 'react';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import { removeTeamMember, inviteTeamMember } from '@/app/(login)/actions';
import useSWR from 'swr';
import { Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Check, AlertCircle } from 'lucide-react';
import { PLANS } from '@/lib/payments/plans';
import { checkoutAction } from '@/lib/payments/actions';
import { switchSubscriptionPlan } from '@/lib/payments/subscription-management';

type ActionState = {
  error?: string;
  success?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function SubscriptionSkeleton() {
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ManageSubscription() {
  const { data: userData } = useSWR<User>('/api/user', fetcher);
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const { data: subscriptionData } = useSWR<any>('/api/subscription', fetcher);
  const { data: pricesData } = useSWR<any>('/api/stripe/prices', fetcher);
  const [showPlanOptions, setShowPlanOptions] = useState(false);

  const currentPlanType = userData?.planType || teamData?.planType;
  const subscriptionType = userData?.stripeSubscriptionId ? 'user' : 'team';
  const subscriptionStatus = userData?.subscriptionStatus || teamData?.subscriptionStatus;
  const hasActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const stripeCustomerId = userData?.stripeCustomerId || teamData?.stripeCustomerId;

  // Get plan details
  const currentPlan = currentPlanType ? PLANS[currentPlanType as keyof typeof PLANS] : null;

  // Get price IDs from Stripe
  const getPriceId = (productName: string) => {
    const product = pricesData?.products?.find((p: any) => p.name === productName);
    if (!product) return null;
    const price = pricesData?.prices?.find((p: any) => p.productId === product.id);
    return price?.id;
  };

  const payAsYouGoPriceId = getPriceId('Transformertokens');
  const proUnlimitedPriceId = getPriceId('Pro Unlimited');
  const teamPriceId = getPriceId('Team');
  const enterprisePriceId = getPriceId('Enterprise');

  const handlePlanSwitch = async (planType: string, priceId: string) => {
    // If user has an active subscription, switch it
    if (hasActiveSubscription) {
      await switchSubscriptionPlan(planType as any, priceId);
    } else {
      // No subscription, create a new one via checkout
      const formData = new FormData();
      formData.append('planType', planType);
      formData.append('priceId', priceId);
      formData.append('quantity', '1');
      await checkoutAction(formData);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Subscription Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Plan Display */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b">
            <div className="mb-4 sm:mb-0">
              <p className="font-medium text-lg">
                {currentPlan ? currentPlan.name : 'No Active Plan'}
              </p>
              <p className="text-sm text-muted-foreground">
                {subscriptionStatus === 'active'
                  ? `Active • ${subscriptionType === 'user' ? 'Individual' : 'Team'} Plan`
                  : subscriptionStatus === 'trialing'
                  ? 'Trial Period'
                  : 'No active subscription'}
              </p>
              {currentPlan && (
                <p className="text-sm font-semibold text-orange-600 mt-1">
                  {currentPlanType === 'pay_as_you_go' && `$${currentPlan.price} per token`}
                  {currentPlanType === 'pro_unlimited' && `$${currentPlan.price}/month`}
                  {currentPlanType === 'team' && `$${currentPlan.price}/seat/month`}
                  {currentPlanType === 'enterprise' && 'Custom pricing'}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {!hasActiveSubscription && (
                <Button
                  type="button"
                  onClick={() => setShowPlanOptions(!showPlanOptions)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Choose a Plan
                </Button>
              )}
              {hasActiveSubscription && (
                <>
                  <Button
                    type="button"
                    onClick={() => setShowPlanOptions(!showPlanOptions)}
                    variant="outline"
                  >
                    {showPlanOptions ? 'Hide Plans' : 'Change Plan'}
                  </Button>
                  {stripeCustomerId && (
                    <form action={customerPortalAction}>
                      <Button type="submit" variant="outline">
                        Manage Billing
                      </Button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Plan Options */}
          {showPlanOptions && (
            <div className="space-y-6">
              {/* Individual Plans */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Individual Plans</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Pay as You Go */}
                  <div className={`border rounded-lg p-4 ${
                    currentPlanType === 'pay_as_you_go' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-lg">{PLANS.pay_as_you_go.name}</h4>
                      {currentPlanType === 'pay_as_you_go' && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold mb-2">
                      ${PLANS.pay_as_you_go.price}
                      <span className="text-sm font-normal text-gray-600"> per token</span>
                    </p>
                    <p className="text-sm text-gray-600 mb-4">{PLANS.pay_as_you_go.description}</p>
                    <ul className="space-y-2 mb-4">
                      {PLANS.pay_as_you_go.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {currentPlanType !== 'pay_as_you_go' && payAsYouGoPriceId && (
                      <Button
                        onClick={() => handlePlanSwitch('pay_as_you_go', payAsYouGoPriceId)}
                        className="w-full"
                        variant={currentPlanType === 'pro_unlimited' ? 'outline' : 'default'}
                      >
                        {currentPlanType === 'pro_unlimited' ? 'Downgrade' : 'Switch'} to Pay as You Go
                      </Button>
                    )}
                  </div>

                  {/* Pro Unlimited */}
                  <div className={`border rounded-lg p-4 relative ${
                    currentPlanType === 'pro_unlimited' ? 'border-blue-500 bg-blue-50' : 'border-2 border-orange-500 bg-orange-50'
                  }`}>
                    {currentPlanType !== 'pro_unlimited' && (
                      <div className="absolute -top-3 right-4 bg-orange-500 text-white text-xs px-3 py-1 rounded-full">
                        Popular
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-lg">{PLANS.pro_unlimited.name}</h4>
                      {currentPlanType === 'pro_unlimited' && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold mb-2">
                      ${PLANS.pro_unlimited.price}
                      <span className="text-sm font-normal text-gray-600">/month</span>
                    </p>
                    <p className="text-sm text-gray-600 mb-4">{PLANS.pro_unlimited.description}</p>
                    <ul className="space-y-2 mb-4">
                      {PLANS.pro_unlimited.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {currentPlanType !== 'pro_unlimited' && proUnlimitedPriceId && (
                      <Button
                        onClick={() => handlePlanSwitch('pro_unlimited', proUnlimitedPriceId)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        {currentPlanType === 'pay_as_you_go' ? 'Upgrade' : 'Switch'} to Pro Unlimited
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Plans */}
              {(subscriptionType === 'team' || !hasActiveSubscription || currentPlanType === 'pay_as_you_go' || currentPlanType === 'pro_unlimited') && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">Team Plans</h3>
                  {subscriptionType === 'user' && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-800">
                        Upgrading to a team plan will cancel your current individual subscription and transfer your account to a team-based plan.
                      </p>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Team Plan */}
                    <div className={`border rounded-lg p-4 ${
                      currentPlanType === 'team' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-lg">{PLANS.team.name}</h4>
                        {currentPlanType === 'team' && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-2">
                        ${PLANS.team.price}
                        <span className="text-sm font-normal text-gray-600">/seat/month</span>
                      </p>
                      <p className="text-sm text-gray-600 mb-4">{PLANS.team.description}</p>
                      <ul className="space-y-2 mb-4">
                        {PLANS.team.features.map((feature, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {currentPlanType !== 'team' && teamPriceId && (
                        <Button
                          onClick={() => window.location.href = '/pricing#team'}
                          className="w-full"
                          variant="default"
                        >
                          Upgrade to Team
                        </Button>
                      )}
                    </div>

                    {/* Enterprise Plan */}
                    <div className={`border rounded-lg p-4 ${
                      currentPlanType === 'enterprise' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-lg">{PLANS.enterprise.name}</h4>
                        {currentPlanType === 'enterprise' && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-2">Custom</p>
                      <p className="text-sm text-gray-600 mb-4">{PLANS.enterprise.description}</p>
                      <ul className="space-y-2 mb-4">
                        {PLANS.enterprise.features.map((feature, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => window.location.href = 'mailto:sales@example.com'}
                        className="w-full"
                        variant="outline"
                      >
                        Contact Sales
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Important Notes */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Plan Change Policy</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Upgrades take effect immediately</li>
                  <li>• Downgrades take effect at the end of your current billing period</li>
                  <li>• You can cancel anytime through the "Manage Billing" portal</li>
                  <li>• Switching between individual plans preserves your token usage history</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembersSkeleton() {
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-4 mt-1">
          <div className="flex items-center space-x-4">
            <div className="size-8 rounded-full bg-gray-200"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-3 w-14 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembers() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const [removeState, removeAction, isRemovePending] = useActionState<
    ActionState,
    FormData
  >(removeTeamMember, {});

  const getUserDisplayName = (user: Pick<User, 'id' | 'name' | 'email'>) => {
    return user.name || user.email || 'Unknown User';
  };

  if (!teamData?.teamMembers?.length) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No team members yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {teamData.teamMembers.map((member, index) => (
            <li key={member.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>
                    {getUserDisplayName(member.user)
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {getUserDisplayName(member.user)}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {member.role}
                  </p>
                </div>
              </div>
              {index > 0 ? (
                <form action={removeAction}>
                  <input type="hidden" name="memberId" value={member.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={isRemovePending}
                  >
                    {isRemovePending ? 'Removing...' : 'Remove'}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {removeState?.error && (
          <p className="text-red-500 mt-4">{removeState.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

function InviteTeamMemberSkeleton() {
  return (
    <Card className="h-[260px]">
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
      </CardHeader>
    </Card>
  );
}

function InviteTeamMember() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const { data: subscriptionData } = useSWR<any>('/api/subscription', fetcher);
  const isOwner = user?.role === 'owner';
  const [inviteState, inviteAction, isInvitePending] = useActionState<
    ActionState,
    FormData
  >(inviteTeamMember, {});

  const purchasedSeats = subscriptionData?.subscription?.quantity || 0;
  const currentMembers = teamData?.teamMembers?.length || 0;
  const seatsRemaining = purchasedSeats > 0 ? purchasedSeats - currentMembers : 0;
  const hasTeamPlan = teamData?.planType === 'team' || teamData?.planType === 'enterprise';

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>Invite Team Member</CardTitle>
          {hasTeamPlan && purchasedSeats > 0 && (
            <div className="text-sm">
              <span className="font-semibold">{currentMembers}/{purchasedSeats}</span>
              <span className="text-muted-foreground ml-1">seats used</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasTeamPlan && seatsRemaining === 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold">Seat limit reached</p>
              <p>You've used all {purchasedSeats} seats. Please upgrade your subscription to add more members.</p>
            </div>
          </div>
        )}
        {hasTeamPlan && seatsRemaining > 0 && seatsRemaining <= 2 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            {seatsRemaining === 1 ? '1 seat remaining' : `${seatsRemaining} seats remaining`}
          </div>
        )}
        <form action={inviteAction} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-2">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email"
              required
              disabled={!isOwner}
            />
          </div>
          <div>
            <Label>Role</Label>
            <RadioGroup
              defaultValue="member"
              name="role"
              className="flex space-x-4"
              disabled={!isOwner}
            >
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="member" id="member" />
                <Label htmlFor="member">Member</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="owner" id="owner" />
                <Label htmlFor="owner">Owner</Label>
              </div>
            </RadioGroup>
          </div>
          {inviteState?.error && (
            <p className="text-red-500">{inviteState.error}</p>
          )}
          {inviteState?.success && (
            <p className="text-green-500">{inviteState.success}</p>
          )}
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isInvitePending || !isOwner || (hasTeamPlan && seatsRemaining === 0)}
          >
            {isInvitePending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Invite Member
              </>
            )}
          </Button>
        </form>
      </CardContent>
      {!isOwner && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            You must be a team owner to invite new members.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">Settings</h1>
      <Suspense fallback={<SubscriptionSkeleton />}>
        <ManageSubscription />
      </Suspense>
      <Suspense fallback={<TeamMembersSkeleton />}>
        <TeamMembers />
      </Suspense>
      <Suspense fallback={<InviteTeamMemberSkeleton />}>
        <InviteTeamMember />
      </Suspense>
    </section>
  );
}
