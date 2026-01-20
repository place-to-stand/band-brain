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
import { Separator } from "@/components/ui/separator";
import { BandList, CreateBandDialog, JoinBandDialog } from "@/components/bands";
import { Plus, Users } from "lucide-react";

export default function BandsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowJoinDialog(true)}>
              <Users className="mr-2 h-4 w-4" />
              Join Band
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Band
            </Button>
          </div>
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
              Create your first band or join an existing one with an invite
              code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Band
              </Button>
              <Button variant="outline" onClick={() => setShowJoinDialog(true)}>
                <Users className="mr-2 h-4 w-4" />
                Join with Code
              </Button>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Create a band</strong> to start managing songs,
                setlists, and gear settings with your bandmates.
              </p>
              <p>
                <strong>Join with a code</strong> if someone has already created
                a band and shared an invite code with you.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateBandDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <JoinBandDialog open={showJoinDialog} onOpenChange={setShowJoinDialog} />
    </div>
  );
}
