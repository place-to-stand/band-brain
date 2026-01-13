"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BandForm } from "@/components/bands/BandForm";
import { ArrowLeft } from "lucide-react";

// TODO: Replace with actual Convex queries/mutations once dev server is running
// import { useQuery, useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditBandPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Use Convex queries/mutations
  // const band = useQuery(api.bands.getById, { id });
  // const updateBand = useMutation(api.bands.update);

  // Placeholder - will be replaced with Convex query
  const band = undefined as {
    _id: string;
    name: string;
    description?: string;
    members: Array<{ name: string; instruments: string[] }>;
    createdAt: number;
  } | undefined | null;

  const handleSubmit = async (data: {
    name: string;
    description: string;
    members: Array<{ name: string; instruments: string[] }>;
  }) => {
    setIsLoading(true);
    try {
      // TODO: Call updateBand mutation
      // await updateBand({
      //   id,
      //   name: data.name,
      //   description: data.description || undefined,
      //   members: data.members,
      // });
      console.log("Update band:", id, data);
      router.push(`/bands/${id}`);
    } catch (error) {
      console.error("Failed to update band:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/bands/${id}`);
  };

  if (band === undefined) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!band) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/bands">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bands
          </Link>
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Band Not Found</h1>
          <p className="text-muted-foreground">
            This band may have been deleted or does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/bands/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Band</h1>
          <p className="text-muted-foreground">Update band details and members</p>
        </div>
      </div>

      <BandForm
        initialData={{
          name: band.name,
          description: band.description || "",
          members: band.members,
        }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}
