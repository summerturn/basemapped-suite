// Server-side stub for @clerk/nextjs/server
export function auth() {
  return { userId: null, sessionId: null };
}

export const clerkClient = {
  users: {
    updateUserMetadata: async (
      _userId: string,
      _metadata: { privateMetadata?: Record<string, any>; publicMetadata?: Record<string, any> }
    ) => ({}),
    getUser: async (_userId?: string | null) => ({
      id: null,
      privateMetadata: {} as Record<string, any>,
      publicMetadata: {} as Record<string, any>,
    }),
  },
};
