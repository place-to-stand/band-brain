"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, Users } from "lucide-react";

interface BandMember {
  name: string;
  instruments: string[];
}

interface BandFormData {
  name: string;
  description: string;
  members: BandMember[];
}

interface BandFormProps {
  initialData?: BandFormData;
  onSubmit: (data: BandFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const COMMON_INSTRUMENTS = [
  "Guitar",
  "Bass",
  "Drums",
  "Vocals",
  "Keyboards",
  "Piano",
  "Saxophone",
  "Trumpet",
  "Violin",
  "Cello",
];

export function BandForm({ initialData, onSubmit, onCancel, isLoading }: BandFormProps) {
  const [formData, setFormData] = useState<BandFormData>(
    initialData || {
      name: "",
      description: "",
      members: [],
    }
  );
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberInstruments, setNewMemberInstruments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Band name is required");
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const addMember = () => {
    if (!newMemberName.trim()) return;

    setFormData((prev) => ({
      ...prev,
      members: [
        ...prev.members,
        { name: newMemberName.trim(), instruments: newMemberInstruments },
      ],
    }));
    setNewMemberName("");
    setNewMemberInstruments([]);
  };

  const removeMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  };

  const toggleInstrument = (instrument: string) => {
    setNewMemberInstruments((prev) =>
      prev.includes(instrument)
        ? prev.filter((i) => i !== instrument)
        : [...prev, instrument]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Band Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter band name"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Brief description of the band"
            disabled={isLoading}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Band Members
          </CardTitle>
          <CardDescription>Add members and their instruments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.members.length > 0 && (
            <div className="space-y-2">
              {formData.members.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.instruments.length > 0
                        ? member.instruments.join(", ")
                        : "No instruments"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(index)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="memberName">Member Name</Label>
              <Input
                id="memberName"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Enter member name"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Instruments</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_INSTRUMENTS.map((instrument) => (
                  <Button
                    key={instrument}
                    type="button"
                    variant={
                      newMemberInstruments.includes(instrument)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => toggleInstrument(instrument)}
                    disabled={isLoading}
                  >
                    {instrument}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={addMember}
              disabled={!newMemberName.trim() || isLoading}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData ? "Update Band" : "Create Band"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
