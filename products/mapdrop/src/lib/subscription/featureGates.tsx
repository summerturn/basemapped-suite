"use client";

import { ReactNode } from "react";
import { useUser } from "@/lib/clerk-stub";
import {
  SubscriptionTier,
  TIER_LIMITS,
  getTierFromUser,
} from "@/lib/subscription/tiers";

export type FeatureName =
  | "privateMaps"
  | "passwordSharing"
  | "teamWorkspace"
  | "territoryTools"
  | "routeOptimization"
  | "unlimitedMaps"
  | "highRowLimit";

const FEATURE_TIER_MAP: Record<FeatureName, SubscriptionTier> = {
  privateMaps: "pro",
  passwordSharing: "pro",
  unlimitedMaps: "pro",
  highRowLimit: "pro",
  teamWorkspace: "team",
  territoryTools: "team",
  routeOptimization: "team",
};

export function useFeatureGate(featureName: FeatureName) {
  const { user, isLoaded } = useUser();
  const tier = isLoaded && user ? getTierFromUser(user) : "free";

  const requiredTier = FEATURE_TIER_MAP[featureName];
  const isEnabled =
    requiredTier === "free" ||
    (requiredTier === "pro" && (tier === "pro" || tier === "team")) ||
    (requiredTier === "team" && tier === "team");

  return {
    isEnabled,
    isLoading: !isLoaded,
    tier,
    requiredTier,
    upgradePrompt: isEnabled
      ? null
      : `This feature requires the ${capitalize(requiredTier)} plan. Upgrade to unlock it.`,
  };
}

export function requireFeature(
  featureName: FeatureName,
  tier: SubscriptionTier
): boolean {
  const required = FEATURE_TIER_MAP[featureName];
  if (required === "free") return true;
  if (required === "pro") return tier === "pro" || tier === "team";
  if (required === "team") return tier === "team";
  return false;
}

export function FeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: FeatureName;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isEnabled, isLoading, upgradePrompt } = useFeatureGate(feature);

  if (isLoading) return null;
  if (isEnabled) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center">
      <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
        Premium Feature
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {upgradePrompt}
      </p>
      <a
        href="/pricing"
        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        View Plans
      </a>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
