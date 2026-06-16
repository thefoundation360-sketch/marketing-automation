import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TIER_LIMITS, SubscriptionTier } from '../types';

export function useSubscription() {
  const { profile } = useAuth();
  const tier: SubscriptionTier = profile?.subscription_tier || 'free';
  const limits = TIER_LIMITS[tier];

  const canSwipe = tier !== 'free' || (profile?.swipes_today ?? 0) < limits.swipes_per_day;
  const canMessage = tier !== 'free' || (profile?.messages_today ?? 0) < limits.messages_per_day;
  const canAddGoal = (count: number) => tier !== 'free' || count < (limits.active_goals as number);
  const isPremium = tier === 'premium' || tier === 'elite' || tier === 'business';
  const isElite = tier === 'elite';
  const isBusiness = tier === 'business';

  const swipesRemaining = tier === 'free'
    ? Math.max(0, (limits.swipes_per_day as number) - (profile?.swipes_today ?? 0))
    : Infinity;

  const messagesRemaining = tier === 'free'
    ? Math.max(0, (limits.messages_per_day as number) - (profile?.messages_today ?? 0))
    : Infinity;

  return {
    tier,
    limits,
    isPremium,
    isElite,
    isBusiness,
    canSwipe,
    canMessage,
    canAddGoal,
    swipesRemaining,
    messagesRemaining,
    canSeeWhoLiked: limits.can_see_who_liked,
    canSeeFullBreakdown: limits.can_see_full_breakdown,
    hasPriorityPlacement: limits.priority_placement,
  };
}
