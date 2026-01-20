"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MemberList,
  InviteCodeDisplay,
  InstrumentPicker,
  LeaveBandDialog,
} from "@/components/bands";
import { ArrowLeft, LogOut, Pencil, Check, X } from "lucide-react";
import { useMutation } from "convex/react";

export default function BandMembersPage() {
  const params = useParams();
  const router = useRouter();
  const bandId = params.bandId as Id<"bands">;

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isEditingInstruments, setIsEditingInstruments] = useState(false);
  const [editedInstruments, setEditedInstruments] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const user = useQuery(api.users.current);
  const band = useQuery(api.bands.get, { id: bandId });
  const members = useQuery(api.bandMemberships.listByBand, { bandId });
  const myMembership = useQuery(api.bandMemberships.getMyMembership, { bandId });

  const updateInstruments = useMutation(api.bandMemberships.updateInstruments);

  const isLoading =
    band === undefined || members === undefined || myMembership === undefined;

  // Not a member or band doesn't exist
  if (band === null || myMembership === null) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Band not found</CardTitle>
            <CardDescription>
              This band doesn&apos;t exist or you don&apos;t have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/bands")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Bands
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleEditInstruments = () => {
    setEditedInstruments(myMembership?.instruments ?? []);
    setIsEditingInstruments(true);
  };

  const handleCancelEdit = () => {
    setIsEditingInstruments(false);
    setEditedInstruments([]);
  };

  const handleSaveInstruments = async () => {
    setIsSaving(true);
    try {
      await updateInstruments({ bandId, instruments: editedInstruments });
      setIsEditingInstruments(false);
    } catch (err) {
      console.error("Failed to update instruments:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/bands")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isLoading ? (
                <span className="animate-pulse bg-muted rounded h-7 w-40 inline-block" />
              ) : (
                band?.name
              )}
            </h1>
            <p className="text-muted-foreground">
              {isLoading ? (
                <span className="animate-pulse bg-muted rounded h-4 w-24 inline-block" />
              ) : (
                `${band?.memberCount} ${band?.memberCount === 1 ? "member" : "members"}`
              )}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowLeaveDialog(true)}
          disabled={isLoading}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {myMembership?.isCreator && band?.memberCount === 1
            ? "Delete Band"
            : "Leave Band"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - Members */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                All members of {band?.name ?? "this band"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-32" />
                          <div className="h-3 bg-muted rounded w-24" />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <div className="h-5 bg-muted rounded w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <MemberList
                  members={members ?? []}
                  currentUserId={user?._id as Id<"users">}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invite Code */}
          <Card>
            <CardHeader>
              <CardTitle>Invite Code</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full animate-pulse" />
                  <div className="h-12 bg-muted rounded animate-pulse" />
                </div>
              ) : (
                <InviteCodeDisplay
                  bandId={bandId}
                  inviteCode={band?.inviteCode ?? ""}
                />
              )}
            </CardContent>
          </Card>

          {/* My Instruments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">My Instruments</CardTitle>
              {!isEditingInstruments ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditInstruments}
                  disabled={isLoading}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveInstruments}
                    disabled={isSaving}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-5 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : isEditingInstruments ? (
                <InstrumentPicker
                  value={editedInstruments}
                  onChange={setEditedInstruments}
                  disabled={isSaving}
                />
              ) : myMembership?.instruments &&
                myMembership.instruments.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {myMembership.instruments.map((instrument) => (
                    <span
                      key={instrument}
                      className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-sm"
                    >
                      {instrument}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No instruments selected
                </p>
              )}
            </CardContent>
          </Card>

          {/* Band Info */}
          {band?.isCreator && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Band Settings</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>You created this band on {new Date(band.createdAt).toLocaleDateString()}</p>
                <Separator className="my-3" />
                <p>As the creator, only you can delete this band.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Leave/Delete Dialog */}
      {band && myMembership && (
        <LeaveBandDialog
          open={showLeaveDialog}
          onOpenChange={setShowLeaveDialog}
          bandId={bandId}
          bandName={band.name}
          isCreator={myMembership.isCreator}
          memberCount={band.memberCount}
        />
      )}
    </div>
  );
}
