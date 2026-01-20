import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        // Update existing user
        await ctx.db.patch(args.existingUserId, {
          name: args.profile.name,
          imageUrl: args.profile.image,
          updatedAt: Date.now(),
        });
        return args.existingUserId;
      }
      // Create new user with required fields
      return await ctx.db.insert("users", {
        email: args.profile.email!,
        name: args.profile.name,
        imageUrl: args.profile.image,
        storageUsedBytes: 0,
        createdAt: Date.now(),
      });
    },
  },
});
