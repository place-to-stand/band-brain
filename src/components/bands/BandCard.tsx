"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { INSTRUMENTS } from "./InstrumentPicker";

interface BandCardProps {
  band: {
    _id: Id<"bands">;
    name: string;
    memberCount: number;
    myInstruments: string[];
    createdAt: number;
  };
}

// Map instrument IDs to display labels
function getInstrumentLabel(id: string): string {
  const instrument = INSTRUMENTS.find((i) => i.id === id);
  return instrument?.label ?? id;
}

export function BandCard({ band }: BandCardProps) {
  return (
    <Link href={`/bands/${band._id}/members`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{band.name}</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {band.memberCount} {band.memberCount === 1 ? "member" : "members"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {band.myInstruments.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {band.myInstruments.map((instrument) => (
                <Badge key={instrument} variant="secondary" className="text-xs">
                  {getInstrumentLabel(instrument)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No instruments selected
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
