export type AssertionType =
  | "coordinate_precision"
  | "spatial_relationship"
  | "bounding_box"
  | "geojson_validity"
  | "crs_check"
  | "topology"
  | "distance"
  | "area"
  | "custom";

export type RunStatus = "pending" | "running" | "passed" | "failed" | "cancelled";
export type AssertionStatus = "pass" | "fail" | "skip" | "error";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  repoUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  totalRuns: number;
  lastRunAt: string | null;
  passRate: number;
}

export interface TestRun {
  id: string;
  projectId: string;
  commitSha: string;
  commitMessage: string;
  branch: string;
  author: string;
  status: RunStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
  skippedAssertions: number;
  errorAssertions: number;
}

export interface AssertionResult {
  id: string;
  runId: string;
  name: string;
  type: AssertionType;
  status: AssertionStatus;
  message: string | null;
  expected: unknown;
  actual: unknown;
  durationMs: number;
  filePath: string | null;
  lineNumber: number | null;
}

export interface DailyTrend {
  date: string;
  passed: number;
  failed: number;
  skipped: number;
  error: number;
  totalRuns: number;
}

export interface AssertionBreakdown {
  type: AssertionType;
  pass: number;
  fail: number;
  skip: number;
  error: number;
}

export interface AnalyticsSummary {
  totalRuns: number;
  totalProjects: number;
  avgPassRate: number;
  avgDurationMs: number;
  trends: DailyTrend[];
  breakdown: AssertionBreakdown[];
}

export interface ApiError {
  status: number;
  message: string;
  code: string;
}
