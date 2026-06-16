// Stub implementation of @clerk/nextjs used when production Clerk keys are not configured.
// This lets MapDrop render publicly while auth-dependent features degrade gracefully.

import * as React from 'react';

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export function useUser() {
  return { user: null as any, isLoaded: true };
}

export function useAuth() {
  return { isSignedIn: false, userId: null, sessionId: null };
}

export function useClerk() {
  return { signOut: async () => {} };
}
