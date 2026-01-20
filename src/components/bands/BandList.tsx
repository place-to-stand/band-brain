"use client";

import { BandCard } from "./BandCard";
import { Id } from "../../../convex/_generated/dataModel";

interface Band {
  _id: Id<"bands">;
  name: string;
  memberCount: number;
  myInstruments: string[];
  createdAt: number;
}

interface BandListProps {
  bands: Band[];
}

export function BandList({ bands }: BandListProps) {
  if (bands.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bands.map((band) => (
        <BandCard key={band._id} band={band} />
      ))}
    </div>
  );
}
