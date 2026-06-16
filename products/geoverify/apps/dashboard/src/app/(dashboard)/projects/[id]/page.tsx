"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { Project, TestRun } from "@/types";
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  SkipForward,
  AlertCircle,
  Clock,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { formatDuration, formatRelativeTime, truncateSha } from "@/lib/utils";
import { TrendChart } from "@/components/charts/TrendChart";
import { SkeletonCard, SkeletonTable } from "@/components/layout/Skeleton";

function StatusBadge({ status }: { status: TestRun["status"] }) {
  const variants: Record<TestRun["status"], { variant: "success" | "destructive" | "warning" | "muted"; icon: React.ReactNode }> = {
    passed: { variant: "success", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    failed: { variant: "destructive", icon: <XCircle className="h-3.5 w-3.5" /> },
    pending: { variant: "warning", icon: <Clock className="h-3.5 w-3.5" /> },
    running: { variant: "warning", icon: <Clock className="h-3.5 w-3.5" /> },
    cancelled: { variant: "muted", icon: <SkipForward className="h-3.5 w-3.5" /> },
  };
  const { variant, icon } = variants[status];
  return (
    <Badge variant={variant} className="gap-1 capitalize">
      {icon}
      {status}
    </Badge>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.projects.get(id), api.runs.listByProject(id)]).then(
      ([proj, runList]) => {
        setProject(proj);
        setRuns(runList);
        setLoading(false);
      }
    );
  }, [id]);

  const trendData = runs.slice(0, 7).reverse().map((run) => ({
    date: run.startedAt,
    passed: run.passedAssertions,
    failed: run.failedAssertions,
    skipped: run.skippedAssertions,
    error: run.errorAssertions,
    totalRuns: run.totalAssertions,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          {loading ? (
            <div className="skeleton h-7 w-48 rounded" />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {project?.name}
            </h1>
          )}
        </div>
        {project?.repoUrl && (
          <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-3.5 w-3.5" />
              Repo
            </Button>
          </a>
        )}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project?.totalRuns}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((project?.passRate ?? 0) * 100)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Latest Run</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatRelativeTime(project?.lastRunAt ?? null)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Branch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5 text-2xl font-bold">
                <GitBranch className="h-5 w-5 text-slate-400" />
                main
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">7-Day Assertion Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || trendData.length === 0 ? (
            <div className="skeleton h-[200px] w-full rounded" />
          ) : (
            <TrendChart data={trendData} showLegend={false} height={200} />
          )}
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Test Runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 pb-6">
              <SkeletonTable rows={5} cols={5} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assertions</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <Link href={`/runs/${run.id}`} className="block">
                        <div className="font-mono text-sm text-slate-600">
                          {truncateSha(run.commitSha)}
                        </div>
                        <div className="text-sm text-slate-900">{run.commitMessage}</div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={run.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        {run.passedAssertions}
                        {run.failedAssertions > 0 && (
                          <>
                            <XCircle className="ml-1.5 h-3.5 w-3.5 text-red-500" />
                            {run.failedAssertions}
                          </>
                        )}
                        {run.skippedAssertions > 0 && (
                          <>
                            <SkipForward className="ml-1.5 h-3.5 w-3.5 text-yellow-500" />
                            {run.skippedAssertions}
                          </>
                        )}
                        {run.errorAssertions > 0 && (
                          <>
                            <AlertCircle className="ml-1.5 h-3.5 w-3.5 text-orange-500" />
                            {run.errorAssertions}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDuration(run.durationMs)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(run.startedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
