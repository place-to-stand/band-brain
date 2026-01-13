"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DronePlayer } from "@/components/training/DronePlayer";
import { ArrowLeft } from "lucide-react";

export default function DronePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/training">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Drone</h1>
          <p className="text-muted-foreground">
            Practice intonation with sustained tones
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-md">
        <DronePlayer />
      </div>
    </div>
  );
}
