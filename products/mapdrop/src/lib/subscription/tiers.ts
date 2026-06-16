export type SubscriptionTier = "free" | "pro" | "team";

export interface TierLimits {
  maxMaps: number;
  maxRows: number;
  ttlDays: number;
  allowPrivate: boolean;
  allowPasswordSharing: boolean;
  allowTeamWorkspace: boolean;
  allowTerritoryTools: boolean;
  allowRouteOptimization: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxMaps: 5,
    maxRows: 1_000,
    ttlDays: 30,
    allowPrivate: false,
    allowPasswordSharing: false,
    allowTeamWorkspace: false,
    allowTerritoryTools: false,
    allowRouteOptimization: false,
  },
  pro: {
    maxMaps: Infinity,
    maxRows: 50_000,
    ttlDays: Infinity,
    allowPrivate: true,
    allowPasswordSharing: true,
    allowTeamWorkspace: false,
    allowTerritoryTools: false,
    allowRouteOptimization: false,
  },
  team: {
    maxMaps: Infinity,
    maxRows: Infinity,
    ttlDays: Infinity,
    allowPrivate: true,
    allowPasswordSharing: true,
    allowTeamWorkspace: true,
    allowTerritoryTools: true,
    allowRouteOptimization: true,
  },
};

export function checkRowLimit(tier: SubscriptionTier, rows: number): boolean {
  const limit = TIER_LIMITS[tier].maxRows;
  if (limit === Infinity) return true;
  return rows <= limit;
}

export function canCreateMap(tier: SubscriptionTier, currentMapCount: number): boolean {
  const limit = TIER_LIMITS[tier].maxMaps;
  if (limit === Infinity) return true;
  return currentMapCount < limit;
}

export function getTierFromUser(user: {
  publicMetadata: Record<string, unknown>;
}): SubscriptionTier {
  const tier = user.publicMetadata?.subscriptionTier;
  if (tier === "pro" || tier === "team") return tier;
  return "free";
}
