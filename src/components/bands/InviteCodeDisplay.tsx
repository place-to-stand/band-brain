"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Id } from "../../../convex/_generated/dataModel";
import { Copy, Check, RefreshCw } from "lucide-react";

interface InviteCodeDisplayProps {
  bandId: Id<"bands">;
  inviteCode: string;
  showRegenerate?: boolean;
}

export function InviteCodeDisplay({
  bandId,
  inviteCode,
  showRegenerate = true,
}: InviteCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const regenerateCode = useMutation(api.bands.regenerateInviteCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = inviteCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await regenerateCode({ id: bandId });
    } catch (err) {
      console.error("Failed to regenerate invite code:", err);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Share this code to invite band members
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border bg-muted/50 p-3 text-center">
          <span className="text-2xl font-mono tracking-widest">{inviteCode}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        {showRegenerate && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            title="Generate new code"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
            />
          </Button>
        )}
      </div>
    </div>
  );
}
