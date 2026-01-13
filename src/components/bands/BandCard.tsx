"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Music, Pencil, Trash2 } from "lucide-react";

interface BandMember {
  name: string;
  instruments: string[];
}

interface Band {
  _id: string;
  name: string;
  description?: string;
  members: BandMember[];
  createdAt: number;
}

interface BandCardProps {
  band: Band;
  onDelete?: (id: string) => void;
}

export function BandCard({ band, onDelete }: BandCardProps) {
  const memberCount = band.members?.length || 0;

  return (
    <Card className="group relative">
      <Link href={`/bands/${band._id}`} className="absolute inset-0 z-0" />
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            {band.name}
          </CardTitle>
          {band.description && (
            <CardDescription className="line-clamp-2">
              {band.description}
            </CardDescription>
          )}
        </div>
        <div className="relative z-10 flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            asChild
          >
            <Link href={`/bands/${band._id}/edit`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                onDelete(band._id);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
