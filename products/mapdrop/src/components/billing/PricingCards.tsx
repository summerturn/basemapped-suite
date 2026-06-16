"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSubscription } from "@/hooks/useSubscription";
import { TIER_LIMITS } from "@/lib/subscription/tiers";

interface PricingCardsProps {
  onSelect?: (plan: "free" | "pro" | "team", interval: "monthly" | "annual") => void;
}

export function PricingCards({ onSelect }: PricingCardsProps) {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const { isSignedIn } = useAuth();
  const { tier, upgrade } = useSubscription();

  const plans = [
    {
      key: "free" as const,
      name: "Free",
      description: "For individuals getting started",
      price: { monthly: 0, annual: 0 },
      features: [
        `${TIER_LIMITS.free.maxMaps} maps`,
        `${TIER_LIMITS.free.maxRows.toLocaleString()} rows`,
        `${TIER_LIMITS.free.ttlDays}-day map TTL`,
        "Public maps only",
      ],
      cta: tier === "free" ? "Current plan" : "Downgrade",
      highlighted: false,
    },
    {
      key: "pro" as const,
      name: "Pro",
      description: "For power users",
      price: { monthly: 29, annual: 24 },
      features: [
        "Unlimited maps",
        `${TIER_LIMITS.pro.maxRows.toLocaleString()} rows`,
        "Unlimited TTL",
        "Private maps",
        "Password sharing",
      ],
      cta: tier === "pro" ? "Current plan" : "Upgrade to Pro",
      highlighted: true,
    },
    {
      key: "team" as const,
      name: "Team",
      description: "For teams and organizations",
      price: { monthly: 79, annual: 66 },
      features: [
        "Everything in Pro",
        "Team workspace",
        "Territory tools",
        "Route optimization",
        "Priority support",
      ],
      cta: tier === "team" ? "Current plan" : "Upgrade to Team",
      highlighted: false,
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-lg border p-1 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              interval === "monthly"
                ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("annual")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              interval === "annual"
                ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Annual{" "}
            <span className="text-green-600 dark:text-green-400 text-xs font-semibold ml-1">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = tier === plan.key;
          const price =
            interval === "monthly" ? plan.price.monthly : plan.price.annual;

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.highlighted
                  ? "border-blue-500 shadow-lg ring-1 ring-blue-500 dark:border-blue-400 dark:ring-blue-400"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold dark:text-gray-100">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold dark:text-gray-100">
                  ${price}
                </span>
                <span className="text-gray-500 dark:text-gray-400">/mo</span>
                {interval === "annual" && plan.price.annual > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    billed annually
                  </p>
                )}
              </div>

              <ul className="mb-6 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <svg
                      className="h-5 w-5 text-green-500 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent || (!isSignedIn && plan.key !== "free")}
                onClick={() => {
                  if (onSelect) onSelect(plan.key, interval);
                  if (plan.key !== "free") {
                    upgrade(plan.key, interval);
                  }
                }}
                className={`w-full rounded-lg py-2.5 text-sm font-semibold transition ${
                  isCurrent
                    ? "bg-gray-100 text-gray-500 cursor-default dark:bg-gray-800 dark:text-gray-400"
                    : plan.highlighted
                    ? "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    : "bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                }`}
              >
                {!isSignedIn && plan.key !== "free"
                  ? "Sign in to upgrade"
                  : plan.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
