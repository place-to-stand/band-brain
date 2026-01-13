"use client";

import { useRouter } from "next/navigation";
import { BandForm } from "@/components/bands/BandForm";
import { useState } from "react";

// TODO: Replace with actual Convex mutation once dev server is running
// import { useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";

export default function NewBandPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Use Convex mutation
  // const createBand = useMutation(api.bands.create);

  const handleSubmit = async (data: {
    name: string;
    description: string;
    members: Array<{ name: string; instruments: string[] }>;
  }) => {
    setIsLoading(true);
    try {
      // TODO: Call createBand mutation
      // const bandId = await createBand({
      //   name: data.name,
      //   description: data.description || undefined,
      // });
      // Then update members if needed
      console.log("Create band:", data);
      router.push("/bands");
    } catch (error) {
      console.error("Failed to create band:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/bands");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Band</h1>
        <p className="text-muted-foreground">
          Add a new band to start managing songs and practice sessions.
        </p>
      </div>

      <BandForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}
