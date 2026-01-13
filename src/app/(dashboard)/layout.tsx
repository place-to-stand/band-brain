"use client";

import { ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import { redirect } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    redirect("/sign-in");
  }

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen">
        <DashboardNav />
        <main className="flex-1 overflow-auto">
          <div className="container py-6">{children}</div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
