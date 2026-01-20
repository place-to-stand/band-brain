"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Id } from "../../../convex/_generated/dataModel";

interface LeaveBandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bandId: Id<"bands">;
  bandName: string;
  isCreator: boolean;
  memberCount: number;
}

export function LeaveBandDialog({
  open,
  onOpenChange,
  bandId,
  bandName,
  isCreator,
  memberCount,
}: LeaveBandDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const leaveBand = useMutation(api.bandMemberships.leave);
  const deleteBand = useMutation(api.bands.softDelete);

  // If user is creator and only member, show delete option
  const showDeleteOption = isCreator && memberCount === 1;

  const handleLeave = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await leaveBand({ bandId });
      onOpenChange(false);
      router.push("/bands");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave band");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await deleteBand({ id: bandId });
      onOpenChange(false);
      router.push("/bands");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete band");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {showDeleteOption ? "Delete Band" : "Leave Band"}
          </DialogTitle>
          <DialogDescription>
            {showDeleteOption ? (
              <>
                You are the only member of <strong>{bandName}</strong>. Leaving
                will delete the band and all associated data.
              </>
            ) : (
              <>
                Are you sure you want to leave <strong>{bandName}</strong>? You
                can rejoin later with an invite code.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive py-2">{error}</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {showDeleteOption ? (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Band"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleLeave}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Leaving..." : "Leave Band"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
