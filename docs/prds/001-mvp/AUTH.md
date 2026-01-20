# Authentication: Google Sign-In

> **Related:** [PROGRESS.md](./PROGRESS.md) | [SCHEMA.md](./SCHEMA.md)

## Why Google Sign-In Only

| Aspect | Benefit |
|--------|---------|
| **UX** | Single-click sign-in, no password to remember |
| **Security** | No password storage, leverages Google's security |
| **Simplicity** | No password reset flow, no email verification |
| **Cost** | Free (Convex Auth included) |

---

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://your-domain.com/api/auth/callback/google` (prod)
7. Copy the Client ID and Client Secret

### 2. Environment Variables

```bash
# .env.local

# Google OAuth
AUTH_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_CLIENT_SECRET=your-client-secret

# Convex Auth (generate with: openssl rand -base64 32)
CONVEX_AUTH_SECRET=your-secret-here
```

### 3. Convex Auth Configuration

```typescript
// convex/auth.ts
import { Google } from "@convex-dev/auth/providers/Google";
import { convexAuth } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google<DataModel>()],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) {
        // Update existing user with latest profile info
        await ctx.db.patch(args.existingUserId, {
          name: args.profile.name,
          imageUrl: args.profile.image,
          updatedAt: Date.now(),
        });
        return args.existingUserId;
      }

      // Create new user
      const userId = await ctx.db.insert("users", {
        email: args.profile.email || "",
        name: args.profile.name,
        imageUrl: args.profile.image,
        storageUsedBytes: 0,
        createdAt: Date.now(),
      });

      return userId;
    },
  },
});
```

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

---

## Client-Side Usage

### Sign-In Button Component

```typescript
// components/auth/GoogleSignInButton.tsx
"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const { signIn } = useAuthActions();

  return (
    <Button
      onClick={() => signIn("google")}
      variant="outline"
      className="w-full"
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        {/* Google icon SVG */}
      </svg>
      Continue with Google
    </Button>
  );
}
```

### Auth Hook

```typescript
// hooks/useAuth.ts
import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useAuth() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.current);

  return {
    isAuthenticated,
    isLoading,
    user,
  };
}
```

### Protected Route Pattern

```typescript
// app/(dashboard)/layout.tsx
"use client";

import { useConvexAuth } from "convex/react";
import { redirect } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    redirect("/sign-in");
  }

  return <>{children}</>;
}
```

---

## Server-Side Auth Check

```typescript
// In Convex functions
export const myMutation = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject as Id<"users">;
    // ... rest of handler
  },
});
```

---

## Sign-In Page

```typescript
// app/(auth)/sign-in/page.tsx
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to BandBrain</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to manage your bands and practice
          </p>
        </div>
        <GoogleSignInButton />
      </div>
    </div>
  );
}
```
