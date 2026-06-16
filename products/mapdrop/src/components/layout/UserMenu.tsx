"use client";

import { useUser, useClerk } from "@/lib/clerk-stub";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { tier } = useSubscription();

  if (!user) return null;

  const planLabel = tier === "team" ? "Team" : tier === "pro" ? "Pro" : "Free";
  const planColor =
    tier === "team"
      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
      : tier === "pro"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 rounded-full border p-1 pr-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <img
          src={user.imageUrl}
          alt={user.fullName ?? "User"}
          className="h-8 w-8 rounded-full object-cover"
        />
        <span className="text-sm font-medium hidden sm:block">{user.firstName}</span>
        <span
          className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${planColor}`}
        >
          {planLabel}
        </span>
      </button>

      <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md border bg-white dark:bg-gray-900 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="p-2">
          <Link
            href="/mapdrop/dashboard"
            className="block rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Dashboard
          </Link>
          <Link
            href="/mapdrop/settings"
            className="block rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Settings
          </Link>
          <Link
            href="/mapdrop/settings/billing"
            className="block rounded px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Billing
          </Link>
          <hr className="my-1 border-gray-100 dark:border-gray-800" />
          <button
            onClick={() => signOut()}
            className="block w-full text-left rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
