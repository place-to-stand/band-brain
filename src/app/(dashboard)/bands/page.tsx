"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BandCard } from "@/components/bands/BandCard";
import { Plus, Music } from "lucide-react";

// TODO: Replace with actual Convex query once dev server is running
// import { useQuery, useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";

export default function BandsPage() {
  // TODO: Use Convex queries
  // const bands = useQuery(api.bands.list);
  // const deleteBand = useMutation(api.bands.softDelete);
  const bands: Array<{
    _id: string;
    name: string;
    description?: string;
    members: Array<{ name: string; instruments: string[] }>;
    createdAt: number;
  }> = [];

  const [, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this band?")) return;

    setIsDeleting(id);
    try {
      // TODO: Call deleteBand mutation
      // await deleteBand({ id });
      console.log("Delete band:", id);
    } catch (error) {
      console.error("Failed to delete band:", error);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bands</h1>
          <p className="text-muted-foreground">
            Manage your bands and their songs
          </p>
        </div>
        <Button asChild>
          <Link href="/bands/new">
            <Plus className="mr-2 h-4 w-4" />
            New Band
          </Link>
        </Button>
      </div>

      {bands === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : bands.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Music className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No bands yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first band to start managing songs and practice.
          </p>
          <Button asChild className="mt-4">
            <Link href="/bands/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Band
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bands.map((band) => (
            <BandCard
              key={band._id}
              band={band}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
