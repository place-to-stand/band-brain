"use client";

import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Music } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface BandCardProps {
  band: {
    _id: Id<"bands">;
    name: string;
    createdAt: number;
  };
}

export function BandCard({ band }: BandCardProps) {
  const createdDate = new Date(band.createdAt).toLocaleDateString();

  return (
    <Link href={`/bands/${band._id}/songs`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="h-4 w-4 text-muted-foreground" />
            {band.name}
          </CardTitle>
          <CardDescription>Created {createdDate}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
