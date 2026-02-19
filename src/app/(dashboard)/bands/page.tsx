"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BandList, CreateBandDialog } from "@/components/bands";
import { Plus } from "lucide-react";

export default function BandsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const user = useQuery(api.users.current);
  const bands = useQuery(api.bands.listMyBands);

  const isLoading = bands === undefined;
  const hasBands = bands && bands.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground">Manage your bands and songs</p>
        </div>
        {hasBands && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Band
          </Button>
        )}
      </div>

      {isLoading ? (
        // Loading skeleton
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-1">
                  <div className="h-5 bg-muted rounded w-16" />
                  <div className="h-5 bg-muted rounded w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hasBands ? (
        <BandList bands={bands} />
      ) : (
        // Empty state
        <Card>
          <CardHeader>
            <CardTitle>No bands yet</CardTitle>
            <CardDescription>
              Create your first band to start managing songs, setlists, and gear
              settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Band
            </Button>
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Bands</strong> are personal song collections. Create
                one for each project, artist, or set of songs you want to
                organize.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateBandDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
