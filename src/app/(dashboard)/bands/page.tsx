"use client";

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

export default function BandsPage() {
  const user = useQuery(api.users.current);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Manage your bands and songs
          </p>
        </div>
        <Button>Create Band</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No bands yet</CardTitle>
          <CardDescription>
            Create your first band or join an existing one with an invite code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button>Create Band</Button>
            <Button variant="outline">Join with Code</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
