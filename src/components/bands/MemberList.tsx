"use client";

import { MemberCard } from "./MemberCard";
import { Id } from "../../../convex/_generated/dataModel";

interface Member {
  _id: Id<"bandMemberships">;
  instruments: string[];
  joinedAt: number;
  user: {
    _id: Id<"users">;
    name?: string;
    email: string;
    imageUrl?: string;
  };
}

interface MemberListProps {
  members: Member[];
  currentUserId: Id<"users">;
}

export function MemberList({ members, currentUserId }: MemberListProps) {
  if (members.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No members found
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <MemberCard
          key={member._id}
          member={member}
          isCurrentUser={member.user._id === currentUserId}
        />
      ))}
    </div>
  );
}
