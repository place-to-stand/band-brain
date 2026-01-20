"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstrumentPicker } from "./InstrumentPicker";

interface JoinBandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialCode?: string;
}

export function JoinBandDialog({
  open,
  onOpenChange,
  onSuccess,
  initialCode = "",
}: JoinBandDialogProps) {
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstruments, setShowInstruments] = useState(false);

  // Preview band info when code is entered
  const bandPreview = useQuery(
    api.bands.getByInviteCode,
    inviteCode.length === 6 ? { inviteCode: inviteCode.toUpperCase() } : "skip"
  );

  const joinBand = useMutation(api.bandMemberships.join);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setInviteCode(initialCode);
      setShowInstruments(false);
      setError(null);
    }
  }, [open, initialCode]);

  // Show instruments picker when band is found
  useEffect(() => {
    if (bandPreview && !showInstruments) {
      setShowInstruments(true);
    }
  }, [bandPreview, showInstruments]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 6) {
      setInviteCode(value);
      setError(null);
      if (value.length < 6) {
        setShowInstruments(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (inviteCode.length !== 6) {
      setError("Please enter a 6-character invite code");
      return;
    }

    if (!bandPreview) {
      setError("Invalid invite code");
      return;
    }

    setIsSubmitting(true);

    try {
      await joinBand({ inviteCode, instruments });
      setInviteCode("");
      setInstruments([]);
      setShowInstruments(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join band");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setInviteCode("");
      setInstruments([]);
      setShowInstruments(false);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Join a Band</DialogTitle>
            <DialogDescription>
              Enter the invite code shared with you to join an existing band.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                placeholder="Enter 6-character code"
                value={inviteCode}
                onChange={handleCodeChange}
                disabled={isSubmitting}
                className="text-center text-xl tracking-widest uppercase"
                maxLength={6}
                autoFocus
              />
            </div>

            {bandPreview && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="font-medium">{bandPreview.name}</p>
                <p className="text-sm text-muted-foreground">
                  {bandPreview.memberCount}{" "}
                  {bandPreview.memberCount === 1 ? "member" : "members"}
                </p>
              </div>
            )}

            {showInstruments && bandPreview && (
              <InstrumentPicker
                value={instruments}
                onChange={setInstruments}
                disabled={isSubmitting}
              />
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !bandPreview || inviteCode.length !== 6}
            >
              {isSubmitting ? "Joining..." : "Join Band"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
