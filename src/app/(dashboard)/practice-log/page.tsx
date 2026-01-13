"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Clock, Calendar, Star, TrendingUp, Music, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// TODO: Replace with actual Convex query once dev server is running
// import { useQuery, useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";

interface PracticeSession {
  _id: string;
  songId?: string;
  songTitle?: string;
  learningProjectId?: string;
  projectTitle?: string;
  startTime: number;
  duration?: number;
  focusAreas?: string[];
  rating?: number;
  notes?: string;
}

export default function PracticeLogPage() {
  // TODO: Use Convex queries
  // const sessions = useQuery(api.practiceSessions.list);
  // const stats = useQuery(api.practiceSessions.getStats);

  const sessions: PracticeSession[] = [];
  const stats = {
    totalSessions: 0,
    totalDuration: 0,
    avgDuration: 0,
    avgRating: 0,
  };

  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("week");

  const formatDuration = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups, session) => {
    const date = new Date(session.startTime).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(session);
    return groups;
  }, {} as Record<string, PracticeSession[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Practice Log</h1>
          <p className="text-muted-foreground">Track your practice sessions and progress</p>
        </div>
        <Button asChild>
          <Link href="/practice-log/new">
            <Plus className="mr-2 h-4 w-4" />
            Log Session
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgDuration > 0 ? formatDuration(Math.round(stats.avgDuration)) : "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        {(["week", "month", "all"] as const).map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange(range)}
          >
            {range === "week" ? "This Week" : range === "month" ? "This Month" : "All Time"}
          </Button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No practice sessions yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              Start logging your practice sessions to track your progress over time.
            </p>
            <Button asChild>
              <Link href="/practice-log/new">
                <Plus className="mr-2 h-4 w-4" />
                Log Your First Session
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSessions).map(([date, daySessions]) => (
            <div key={date}>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {formatDate(daySessions[0].startTime)}
              </h3>
              <div className="space-y-2">
                {daySessions.map((session) => (
                  <Card key={session._id} className="cursor-pointer hover:bg-muted/50">
                    <CardContent className="flex items-center gap-4 py-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          session.songId
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {session.songId ? (
                          <Music className="h-5 w-5" />
                        ) : (
                          <BookOpen className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {session.songTitle || session.projectTitle || "Untitled"}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {session.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(session.duration)}
                            </span>
                          )}
                          {session.focusAreas && session.focusAreas.length > 0 && (
                            <span>{session.focusAreas.slice(0, 2).join(", ")}</span>
                          )}
                        </div>
                      </div>
                      {session.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{session.rating}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
