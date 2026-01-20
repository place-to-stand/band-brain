"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { INSTRUMENTS } from "./InstrumentPicker";
import { Id } from "../../../convex/_generated/dataModel";

interface MemberCardProps {
  member: {
    _id: Id<"bandMemberships">;
    instruments: string[];
    joinedAt: number;
    user: {
      _id: Id<"users">;
      name?: string;
      email: string;
      imageUrl?: string;
    };
  };
  isCurrentUser: boolean;
}

function getInstrumentLabel(id: string): string {
  const instrument = INSTRUMENTS.find((i) => i.id === id);
  return instrument?.label ?? id;
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

export function MemberCard({ member, isCurrentUser }: MemberCardProps) {
  const displayName = member.user.name || member.user.email;
  const joinDate = new Date(member.joinedAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={member.user.imageUrl} alt={displayName} />
          <AvatarFallback>
            {getInitials(member.user.name, member.user.email)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{displayName}</p>
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">
                You
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Joined {joinDate}</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-1 max-w-[200px]">
        {member.instruments.length > 0 ? (
          member.instruments.map((instrument) => (
            <Badge key={instrument} variant="secondary" className="text-xs">
              {getInstrumentLabel(instrument)}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No instruments</span>
        )}
      </div>
    </div>
  );
}
