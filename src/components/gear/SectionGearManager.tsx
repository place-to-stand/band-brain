"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { GearPieceEditor, GearPiece } from "./GearPieceEditor";
import { AddGearDialog } from "./AddGearDialog";
import { SectionNotesEditor } from "./SectionNotesEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  StickyNote,
  Trash2,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Music2,
} from "lucide-react";
import { toast } from "sonner";

interface SectionGearManagerProps {
  songId: Id<"songs">;
  generalNotes?: string;
  onGeneralNotesChange?: (notes: string) => void;
}

// Instruments in preferred order (synth second)
const INSTRUMENTS = [
  { value: "guitar", label: "Guitar" },
  { value: "synth", label: "Synth/Keys" },
  { value: "bass", label: "Bass" },
  { value: "drums", label: "Drums" },
  { value: "vocals", label: "Vocals" },
  { value: "other", label: "Other" },
] as const;

export function SectionGearManager({
  songId,
  generalNotes = "",
  onGeneralNotesChange,
}: SectionGearManagerProps) {
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);
  const [showAddGearDialog, setShowAddGearDialog] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<Id<"songSections"> | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionInstrument, setNewSectionInstrument] = useState("guitar");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState<Id<"songSections"> | null>(null);

  // Collapsed state for notes - computed from state AND prop
  const [notesManuallyOpened, setNotesManuallyOpened] = useState(false);
  const [expandedSectionNotes, setExpandedSectionNotes] = useState<Set<string>>(new Set());

  // Show notes if content exists OR user manually opened
  const showGeneralNotes = !!generalNotes || notesManuallyOpened;

  // Queries
  const sections = useQuery(api.songSections.listBySong, { songId });
  const previousGearNames = useQuery(api.songSections.getAllGearNames, {});

  // Mutations
  const createSection = useMutation(api.songSections.createWithGear);
  const updateSection = useMutation(api.songSections.update);
  const updateGearSettings = useMutation(api.songSections.updateGearSettings);
  const deleteSection = useMutation(api.songSections.softDelete);
  const reorderSections = useMutation(api.songSections.reorder);

  // Group sections by instrument for display
  const sectionsByInstrument = useMemo(() => {
    if (!sections) return {};
    const grouped: Record<string, typeof sections> = {};
    for (const section of sections) {
      if (!grouped[section.instrument]) {
        grouped[section.instrument] = [];
      }
      grouped[section.instrument].push(section);
    }
    return grouped;
  }, [sections]);

  // Get instruments in display order (those with sections, in preferred order)
  const instrumentsWithSections = useMemo(() => {
    return INSTRUMENTS.filter((inst) => sectionsByInstrument[inst.value]?.length > 0);
  }, [sectionsByInstrument]);

  // Handle creating a new section
  const handleCreateSection = async () => {
    if (!newSectionName.trim()) {
      toast.error("Section name is required");
      return;
    }

    try {
      await createSection({
        songId,
        instrument: newSectionInstrument,
        name: newSectionName.trim(),
        gearSettings: { gear: [] },
      });

      setShowAddSectionDialog(false);
      setNewSectionName("");
      setNewSectionInstrument("guitar");
      toast.success("Section created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create section");
    }
  };

  // Handle updating section notes
  const handleUpdateSectionNotes = async (sectionId: Id<"songSections">, notes: string) => {
    try {
      await updateSection({ id: sectionId, notes });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update notes");
    }
  };

  // Handle reordering sections within an instrument
  const handleMoveSection = async (sectionId: Id<"songSections">, direction: "up" | "down") => {
    if (!sections) return;

    const section = sections.find((s) => s._id === sectionId);
    if (!section) return;

    const instrumentSections = sectionsByInstrument[section.instrument];
    if (!instrumentSections) return;

    const currentIndex = instrumentSections.findIndex((s) => s._id === sectionId);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= instrumentSections.length) return;

    // Create new order
    const newOrder = [...instrumentSections];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    try {
      await reorderSections({ sectionIds: newOrder.map((s) => s._id) });
    } catch {
      toast.error("Failed to reorder");
    }
  };

  // Handle adding gear to a section
  const handleAddGear = useCallback(
    async (gear: GearPiece) => {
      if (!activeSectionId || !sections) return;

      const section = sections.find((s) => s._id === activeSectionId);
      if (!section) return;

      const currentGear = section.gearSettings?.gear || [];
      try {
        await updateGearSettings({
          id: activeSectionId,
          gearSettings: {
            gear: [...currentGear, gear],
            notes: section.gearSettings?.notes,
          },
        });
        toast.success(`Added ${gear.name}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add gear");
      }
    },
    [activeSectionId, sections, updateGearSettings]
  );

  // Handle updating a gear piece
  const handleUpdateGear = useCallback(
    async (sectionId: Id<"songSections">, gearIndex: number, updatedGear: GearPiece) => {
      if (!sections) return;
      const section = sections.find((s) => s._id === sectionId);
      if (!section) return;

      const currentGear = [...(section.gearSettings?.gear || [])];
      currentGear[gearIndex] = updatedGear;

      try {
        await updateGearSettings({
          id: sectionId,
          gearSettings: {
            gear: currentGear,
            notes: section.gearSettings?.notes,
          },
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update gear");
      }
    },
    [sections, updateGearSettings]
  );

  // Handle removing a gear piece
  const handleRemoveGear = useCallback(
    async (sectionId: Id<"songSections">, gearIndex: number) => {
      if (!sections) return;
      const section = sections.find((s) => s._id === sectionId);
      if (!section) return;

      const currentGear = [...(section.gearSettings?.gear || [])];
      const removedGear = currentGear[gearIndex];
      currentGear.splice(gearIndex, 1);

      try {
        await updateGearSettings({
          id: sectionId,
          gearSettings: {
            gear: currentGear,
            notes: section.gearSettings?.notes,
          },
        });
        toast.success(`Removed ${removedGear.name}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove gear");
      }
    },
    [sections, updateGearSettings]
  );

  // Handle moving gear within a section
  const handleMoveGear = useCallback(
    async (sectionId: Id<"songSections">, gearIndex: number, direction: "up" | "down") => {
      if (!sections) return;
      const section = sections.find((s) => s._id === sectionId);
      if (!section) return;

      const currentGear = [...(section.gearSettings?.gear || [])];
      const newIndex = direction === "up" ? gearIndex - 1 : gearIndex + 1;

      if (newIndex < 0 || newIndex >= currentGear.length) return;

      [currentGear[gearIndex], currentGear[newIndex]] = [currentGear[newIndex], currentGear[gearIndex]];

      try {
        await updateGearSettings({
          id: sectionId,
          gearSettings: {
            gear: currentGear,
            notes: section.gearSettings?.notes,
          },
        });
      } catch (err) {
        toast.error("Failed to reorder gear");
      }
    },
    [sections, updateGearSettings]
  );

  // Handle deleting a section
  const handleDeleteSection = async () => {
    if (!deletingSectionId) return;

    try {
      await deleteSection({ id: deletingSectionId });
      toast.success("Section deleted");
      setShowDeleteDialog(false);
      setDeletingSectionId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete section");
    }
  };

  const isLoading = sections === undefined;
  const hasAnySections = sections && sections.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <StickyNote className="h-5 w-5" />
              Performance Notes
            </CardTitle>
            <CardDescription className="text-xs">
              Gear and notes for each part of the song
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!showGeneralNotes && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-7"
                onClick={() => setNotesManuallyOpened(true)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Notes
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSectionDialog(true)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Section
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* General Notes - collapsed by default */}
        {showGeneralNotes && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">General Notes</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-xs text-muted-foreground"
                onClick={() => {
                  if (!generalNotes) setNotesManuallyOpened(false);
                }}
              >
                {!generalNotes && "×"}
              </Button>
            </div>
            <Textarea
              value={generalNotes}
              onChange={(e) => onGeneralNotesChange?.(e.target.value)}
              placeholder="Overall notes for this song..."
              className="min-h-[60px] text-sm resize-none"
            />
          </div>
        )}

        {/* Sections - flat list grouped by instrument */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : !hasAnySections ? (
          <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
            <Music2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm mb-2">No sections yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSectionDialog(true)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Section
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {instrumentsWithSections.map((inst) => {
              const instrumentSections = sectionsByInstrument[inst.value] || [];

              return (
                <div key={inst.value} className="space-y-2">
                  {/* Instrument header - subtle */}
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                    {inst.label}
                  </div>

                  {/* Sections for this instrument */}
                  {instrumentSections.map((section, sectionIndex) => {
                    const gearCount = section.gearSettings?.gear?.length || 0;
                    const hasNotes = !!section.notes;
                    const notesExpanded = expandedSectionNotes.has(section._id);

                    return (
                      <div
                        key={section._id}
                        className="border rounded-lg bg-card overflow-hidden"
                      >
                        {/* Section header */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                          <span className="font-medium text-sm flex-1">{section.name}</span>

                          {/* Notes button - only show if notes not expanded */}
                          {!notesExpanded && !hasNotes && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-muted-foreground"
                              onClick={() => {
                                setExpandedSectionNotes((prev) => new Set(prev).add(section._id));
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Notes
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              setActiveSectionId(section._id);
                              setShowAddGearDialog(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Gear
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleMoveSection(section._id, "up")}
                                disabled={sectionIndex === 0}
                              >
                                <ChevronUp className="mr-2 h-4 w-4" />
                                Move Up
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleMoveSection(section._id, "down")}
                                disabled={sectionIndex === instrumentSections.length - 1}
                              >
                                <ChevronDown className="mr-2 h-4 w-4" />
                                Move Down
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeletingSectionId(section._id);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Section content */}
                        <div className="px-3 py-2 space-y-2">
                          {/* Section notes - collapsed by default */}
                          {(notesExpanded || hasNotes) && (
                            <SectionNotesEditor
                              value={section.notes || ""}
                              onSave={(notes) => handleUpdateSectionNotes(section._id, notes)}
                              onCollapse={() => {
                                setExpandedSectionNotes((prev) => {
                                  const next = new Set(prev);
                                  next.delete(section._id);
                                  return next;
                                });
                              }}
                              autoFocus={notesExpanded && !hasNotes}
                            />
                          )}

                          {/* Gear pieces */}
                          {gearCount > 0 ? (
                            <div className="space-y-1.5">
                              {section.gearSettings!.gear.map((gear, gearIndex) => (
                                <GearPieceEditor
                                  key={gearIndex}
                                  gear={gear}
                                  gearIndex={gearIndex}
                                  totalGear={gearCount}
                                  onChange={(updated) => handleUpdateGear(section._id, gearIndex, updated)}
                                  onRemove={() => handleRemoveGear(section._id, gearIndex)}
                                  onMoveUp={() => handleMoveGear(section._id, gearIndex, "up")}
                                  onMoveDown={() => handleMoveGear(section._id, gearIndex, "down")}
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground py-1">No gear configured</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Section Dialog */}
      <Dialog open={showAddSectionDialog} onOpenChange={setShowAddSectionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
            <DialogDescription>
              Create a new section for performance notes and gear
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section-instrument">Instrument</Label>
              <Select
                value={newSectionInstrument}
                onValueChange={setNewSectionInstrument}
              >
                <SelectTrigger id="section-instrument">
                  <SelectValue placeholder="Select instrument" />
                </SelectTrigger>
                <SelectContent>
                  {INSTRUMENTS.map((inst) => (
                    <SelectItem key={inst.value} value={inst.value}>
                      {inst.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-name">Section Name</Label>
              <Input
                id="section-name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="e.g., Intro sparkles, Heavy chorus, etc."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSection();
                }}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSectionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSection} disabled={!newSectionName.trim()}>
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Gear Dialog */}
      <AddGearDialog
        open={showAddGearDialog}
        onOpenChange={setShowAddGearDialog}
        onAdd={handleAddGear}
        previousGearNames={previousGearNames || []}
      />

      {/* Delete Section Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the section and all its gear settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
