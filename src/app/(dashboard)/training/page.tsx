"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Music2, Zap, BookOpen, ChevronRight } from "lucide-react";

const trainingTools = [
  {
    title: "Metronome",
    description: "Keep time with a customizable click track",
    icon: Timer,
    href: "/training/metronome",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    title: "Drone",
    description: "Practice with sustained tones for intonation",
    icon: Music2,
    href: "/training/drone",
    color: "bg-green-500/10 text-green-500",
  },
  {
    title: "Daily Lick",
    description: "Learn a new lick every day",
    icon: Zap,
    href: "/training/licks",
    color: "bg-orange-500/10 text-orange-500",
  },
];

export default function TrainingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Training Tools</h1>
        <p className="text-muted-foreground">
          Practice tools to help you improve your skills
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trainingTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card key={tool.href} className="group cursor-pointer transition-shadow hover:shadow-md">
              <Link href={tool.href}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`rounded-lg p-2 ${tool.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <CardTitle className="mt-4">{tool.title}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
              </Link>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Quick Practice
          </CardTitle>
          <CardDescription>
            Jump into a practice session with your recent songs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            No recent songs. Add songs to your bands to start practicing!
          </p>
          <Button variant="outline" asChild>
            <Link href="/bands">Go to Bands</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
