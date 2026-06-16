"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { AnalyticsSummary } from "@/types";
import { TrendChart } from "@/components/charts/TrendChart";
import { AssertionBreakdownChart } from "@/components/charts/AssertionBreakdown";
import { Activity, TrendingUp, Layers, Clock } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { SkeletonCard } from "@/components/layout/Skeleton";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analytics.summary().then((summary) => {
      setData(summary);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="text-muted-foreground">Track test performance across all projects</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Activity className="h-4 w-4" />
                Total Runs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.totalRuns}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Avg Pass Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Math.round((data?.avgPassRate ?? 0) * 100)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Layers className="h-4 w-4" />
                Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.totalProjects}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Avg Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatDuration(data?.avgDurationMs ?? null)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pass/Fail Trend (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <div className="skeleton h-[300px] w-full rounded" />
            ) : (
              <TrendChart data={data.trends} height={300} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assertion Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <div className="skeleton h-[300px] w-full rounded" />
            ) : (
              <AssertionBreakdownChart data={data.breakdown} height={300} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
