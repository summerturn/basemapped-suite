"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type { TestRun, AssertionResult, AssertionType, AssertionStatus } from "@/types";
import {
  ArrowLeft,
  GitCommit,
  GitBranch,
  User,
  CheckCircle2,
  XCircle,
  SkipForward,
  AlertCircle,
  Clock,
  Search,
} from "lucide-react";
import { formatDuration, formatDateTime, truncateSha } from "@/lib/utils";
import { SkeletonTable } from "@/components/layout/Skeleton";

const ASSERTION_TYPE_LABELS: Record<AssertionType, string> = {
  coordinate_precision: "Coordinate Precision",
  spatial_relationship: "Spatial Relationship",
  bounding_box: "Bounding Box",
  geojson_validity: "GeoJSON Validity",
  crs_check: "CRS Check",
  topology: "Topology",
  distance: "Distance",
  area: "Area",
  custom: "Custom",
};

function AssertionStatusBadge({ status }: { status: AssertionStatus }) {
  const config: Record<AssertionStatus, { variant: "success" | "destructive" | "warning" | "muted"; icon: React.ReactNode }> = {
    pass: { variant: "success", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    fail: { variant: "destructive", icon: <XCircle className="h-3.5 w-3.5" /> },
    skip: { variant: "warning", icon: <SkipForward className="h-3.5 w-3.5" /> },
    error: { variant: "muted", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  };
  const { variant, icon } = config[status];
  return (
    <Badge variant={variant} className="gap-1 capitalize">
      {icon}
      {status}
    </Badge>
  );
}

export default function RunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [run, setRun] = useState<TestRun | null>(null);
  const [assertions, setAssertions] = useState<AssertionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    Promise.all([api.runs.get(id), api.runs.getAssertions(id)]).then(
      ([runData, assertionData]) => {
        setRun(runData);
        setAssertions(assertionData);
        setLoading(false);
      }
    );
  }, [id]);

  const filtered = assertions.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || a.type === typeFilter;
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const assertionTypes = Array.from(new Set(assertions.map((a) => a.type)));
  const assertionStatuses = Array.from(new Set(assertions.map((a) => a.status)));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/projects/${run?.projectId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          {loading ? (
            <div className="skeleton h-7 w-48 rounded" />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Run {truncateSha(run?.commitSha ?? "")}
            </h1>
          )}
        </div>
      </div>

      {/* Commit Info */}
      <Card>
        <CardContent className="py-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <GitCommit className="mt-0.5 h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-900">{run?.commitMessage}</div>
                  <div className="font-mono text-xs text-muted-foreground">{run?.commitSha}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GitBranch className="mt-0.5 h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-900">{run?.branch}</div>
                  <div className="text-xs text-muted-foreground">Branch</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-900">{run?.author}</div>
                  <div className="text-xs text-muted-foreground">Author</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-900">{formatDuration(run?.durationMs ?? null)}</div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {run?.passedAssertions} / {run?.totalAssertions} passed
                  </div>
                  <div className="text-xs text-muted-foreground">Assertions</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-900">{formatDateTime(run?.startedAt ?? null)}</div>
                  <div className="text-xs text-muted-foreground">Started</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search assertions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {assertionTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {ASSERTION_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {assertionStatuses.map((status) => (
              <SelectItem key={status} value={status} className="capitalize">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assertion Results</CardTitle>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((assertion) => (
                  <TableRow key={assertion.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{assertion.name}</div>
                      {assertion.message && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{assertion.message}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ASSERTION_TYPE_LABELS[assertion.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <AssertionStatusBadge status={assertion.status} />
                    </TableCell>
                    <TableCell>{formatDuration(assertion.durationMs)}</TableCell>
                    <TableCell>
                      <div className="font-mono text-xs text-muted-foreground">
                        {assertion.filePath}:{assertion.lineNumber}
                      </div>
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
