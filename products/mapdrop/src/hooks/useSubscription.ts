'use client';

import { useState, useEffect, useCallback } from 'react';

interface Subscription {
  tier: 'free' | 'pro' | 'team';
  rowLimit: number;
  mapLimit: number;
  features: string[];
}

const TIER_DEFAULTS: Record<string, Subscription> = {
  free: { tier: 'free', rowLimit: 1000, mapLimit: 5, features: ['public_maps'] },
  pro: { tier: 'pro', rowLimit: 50000, mapLimit: Infinity, features: ['public_maps', 'private_maps', 'password_share', 'embed'] },
  team: { tier: 'team', rowLimit: Infinity, mapLimit: Infinity, features: ['public_maps', 'private_maps', 'password_share', 'embed', 'team_workspace', 'territory_tools', 'route_optimization', 'pmtiles'] },
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription>(TIER_DEFAULTS.free);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((data) => {
        setSubscription(data.tier ? TIER_DEFAULTS[data.tier] || TIER_DEFAULTS.free : TIER_DEFAULTS.free);
      })
      .catch(() => setSubscription(TIER_DEFAULTS.free))
      .finally(() => setIsLoading(false));
  }, []);

  const canCreateMap = useCallback(
    (currentMapCount: number) => {
      return currentMapCount < subscription.mapLimit;
    },
    [subscription.mapLimit]
  );

  const checkRowLimit = useCallback(
    (rows: number) => {
      return rows <= subscription.rowLimit;
    },
    [subscription.rowLimit]
  );

  const hasFeature = useCallback(
    (feature: string) => {
      return subscription.features.includes(feature);
    },
    [subscription.features]
  );

  const upgrade = useCallback(
    (plan: 'free' | 'pro' | 'team', _interval: 'monthly' | 'annual') => {
      // TODO: wire up Stripe checkout session creation
      console.log('[useSubscription] upgrade requested', plan);
    },
    []
  );

  return { subscription, tier: subscription.tier, isLoading, canCreateMap, checkRowLimit, hasFeature, upgrade };
}
