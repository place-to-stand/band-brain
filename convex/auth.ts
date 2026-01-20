import Google from "@auth/core/providers/google";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // Build tokenIdentifier matching Convex Auth format: providerId|providerSubject
      // The profile.sub is the Google user ID for OAuth providers
      const providerSubject = (args.profile as { sub?: string }).sub ?? args.profile.email;
      const tokenIdentifier = `${args.provider.id}|${providerSubject}`;

      if (args.existingUserId) {
        // Update existing user - also ensure tokenIdentifier is set
        await ctx.db.patch(args.existingUserId, {
          name: args.profile.name,
          imageUrl: args.profile.image,
          tokenIdentifier,
          updatedAt: Date.now(),
        });
        return args.existingUserId;
      }
      // Create new user with required fields
      return await ctx.db.insert("users", {
        email: args.profile.email!,
        name: args.profile.name,
        imageUrl: args.profile.image,
        tokenIdentifier,
        storageUsedBytes: 0,
        createdAt: Date.now(),
      });
    },
  },
});

// Re-export getAuthUserId for use in other functions
export { getAuthUserId };
