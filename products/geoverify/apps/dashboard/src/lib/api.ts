import type {
  Project,
  TestRun,
  AssertionResult,
  AnalyticsSummary,
  AssertionBreakdown,
  ApiError,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(error: ApiError) {
    super(error.message);
    this.status = error.status;
    this.code = error.code;
    this.name = "ApiClientError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = (await res.json().catch(() => ({
      status: res.status,
      message: res.statusText,
      code: "unknown_error",
    }))) as ApiError;
    throw new ApiClientError(error);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  return handleResponse<T>(res);
}

async function post<T, B = unknown>(path: string, body: B): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return handleResponse<T>(res);
}

// Mock data generators for development
function generateMockProjects(): Project[] {
  return [
    {
      id: "proj_1",
      name: "Terrafirma Core",
      slug: "terrafirma-core",
      description: "Core geospatial validation engine for coordinate systems and projections.",
      repoUrl: "https://github.com/geoverify/terrafirma-core",
      ownerId: "user_1",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-03-20T14:30:00Z",
      totalRuns: 342,
      lastRunAt: "2024-03-20T14:30:00Z",
      passRate: 0.94,
    },
    {
      id: "proj_2",
      name: "GeoPipeline",
      slug: "geo-pipeline",
      description: "CI/CD pipeline runner with spatial data ingestion and transformation.",
      repoUrl: "https://github.com/geoverify/geo-pipeline",
      ownerId: "user_1",
      createdAt: "2024-02-01T08:00:00Z",
      updatedAt: "2024-03-19T11:00:00Z",
      totalRuns: 128,
      lastRunAt: "2024-03-19T11:00:00Z",
      passRate: 0.87,
    },
    {
      id: "proj_3",
      name: "Bounds Checker",
      slug: "bounds-checker",
      description: "Automated bounding box and extent validation for map tiles.",
      repoUrl: "https://github.com/geoverify/bounds-checker",
      ownerId: "user_1",
      createdAt: "2024-02-20T09:00:00Z",
      updatedAt: "2024-03-18T16:45:00Z",
      totalRuns: 89,
      lastRunAt: "2024-03-18T16:45:00Z",
      passRate: 0.96,
    },
  ];
}

function generateMockRuns(projectId: string): TestRun[] {
  const statuses = ["passed", "failed", "passed", "passed", "cancelled"] as const;
  return Array.from({ length: 8 }).map((_, i) => {
    const total = 40 + Math.floor(Math.random() * 60);
    const failed = statuses[i] === "failed" ? Math.floor(Math.random() * 8) + 1 : 0;
    const skipped = Math.floor(Math.random() * 5);
    const error = statuses[i] === "cancelled" ? Math.floor(Math.random() * 3) + 1 : 0;
    const passed = total - failed - skipped - error;
    return {
      id: `run_${projectId}_${i}`,
      projectId,
      commitSha: `a1b2c3d${i}e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9`,
      commitMessage: [
        "feat: add WGS84 coordinate validation",
        "fix: bounding box overflow on antimeridian",
        "chore: update GeoJSON schema to RFC 7946",
        "feat: implement topology check for polygons",
        "refactor: extract CRS transformer module",
        "test: add integration tests for distance calc",
        "fix: handle null island edge case",
        "perf: optimize spatial index queries",
      ][i],
      branch: i % 3 === 0 ? "main" : "feature/geo-validation",
      author: ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Tim Berners-Lee"][i % 4],
      status: statuses[i],
      startedAt: new Date(Date.now() - i * 86400000 - 3600000).toISOString(),
      completedAt: new Date(Date.now() - i * 86400000).toISOString(),
      durationMs: 12000 + Math.floor(Math.random() * 48000),
      totalAssertions: total,
      passedAssertions: passed,
      failedAssertions: failed,
      skippedAssertions: skipped,
      errorAssertions: error,
    };
  });
}

function generateMockAssertions(runId: string): AssertionResult[] {
  const types = [
    "coordinate_precision",
    "spatial_relationship",
    "bounding_box",
    "geojson_validity",
    "crs_check",
    "topology",
    "distance",
    "area",
    "custom",
  ] as const;
  const names = [
    "Coordinate precision within 1cm",
    "Point inside polygon check",
    "Bounding box contains feature",
    "GeoJSON is valid RFC 7946",
    "CRS matches EPSG:4326",
    "Polygon has no self-intersections",
    "Haversine distance within tolerance",
    "Polygon area matches expected",
    "Custom business rule #7",
  ];
  return Array.from({ length: 24 }).map((_, i) => {
    const r = Math.random();
    const status: AssertionResult["status"] =
      r > 0.85 ? "fail" : r > 0.78 ? "error" : r > 0.72 ? "skip" : "pass";
    return {
      id: `assert_${runId}_${i}`,
      runId,
      name: names[i % names.length],
      type: types[i % types.length],
      status,
      message:
        status === "pass"
          ? null
          : status === "fail"
          ? "Expected value does not match actual"
          : status === "error"
          ? "Unexpected exception during assertion"
          : "Skipped due to precondition failure",
      expected: { precision: 0.01, unit: "meters" },
      actual: status === "pass" ? { precision: 0.008, unit: "meters" } : { precision: 0.15, unit: "meters" },
      durationMs: 45 + Math.floor(Math.random() * 400),
      filePath: `src/tests/geo/${types[i % types.length]}.test.ts`,
      lineNumber: 24 + (i % 10) * 3,
    };
  });
}

function generateMockAnalytics(): AnalyticsSummary {
  const trends: AnalyticsSummary["trends"] = Array.from({ length: 7 }).map((_, i) => {
    const total = 15 + Math.floor(Math.random() * 20);
    const failed = Math.floor(Math.random() * 4);
    const skipped = Math.floor(Math.random() * 3);
    const error = Math.floor(Math.random() * 2);
    return {
      date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0],
      passed: total - failed - skipped - error,
      failed,
      skipped,
      error,
      totalRuns: total,
    };
  });

  const breakdown: AssertionBreakdown[] = [
    { type: "coordinate_precision", pass: 98, fail: 2, skip: 0, error: 0 },
    { type: "spatial_relationship", pass: 85, fail: 10, skip: 3, error: 2 },
    { type: "bounding_box", pass: 92, fail: 5, skip: 2, error: 1 },
    { type: "geojson_validity", pass: 88, fail: 8, skip: 3, error: 1 },
    { type: "crs_check", pass: 95, fail: 3, skip: 1, error: 1 },
    { type: "topology", pass: 78, fail: 15, skip: 4, error: 3 },
    { type: "distance", pass: 90, fail: 6, skip: 2, error: 2 },
    { type: "area", pass: 82, fail: 12, skip: 4, error: 2 },
    { type: "custom", pass: 70, fail: 20, skip: 6, error: 4 },
  ];

  const totalRuns = trends.reduce((sum, t) => sum + t.totalRuns, 0);
  const totalPassed = breakdown.reduce((sum, b) => sum + b.pass, 0);
  const totalAssertions = breakdown.reduce((sum, b) => sum + b.pass + b.fail + b.skip + b.error, 0);

  return {
    totalRuns,
    totalProjects: 3,
    avgPassRate: totalPassed / totalAssertions,
    avgDurationMs: 24500,
    trends,
    breakdown,
  };
}

// API methods with mock fallback
export const api = {
  projects: {
    list: async (): Promise<Project[]> => {
      try {
        return await get<Project[]>("/projects");
      } catch {
        return generateMockProjects();
      }
    },
    get: async (id: string): Promise<Project> => {
      try {
        return await get<Project>(`/projects/${id}`);
      } catch {
        const projects = generateMockProjects();
        return projects.find((p) => p.id === id) ?? projects[0];
      }
    },
    create: async (data: { name: string; slug: string; description?: string; repoUrl?: string }): Promise<Project> => {
      try {
        return await post<Project>("/projects", data);
      } catch {
        return {
          id: `proj_${Date.now()}`,
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          repoUrl: data.repoUrl ?? null,
          ownerId: "user_1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalRuns: 0,
          lastRunAt: null,
          passRate: 0,
        };
      }
    },
  },
  runs: {
    listByProject: async (projectId: string): Promise<TestRun[]> => {
      try {
        return await get<TestRun[]>(`/projects/${projectId}/runs`);
      } catch {
        return generateMockRuns(projectId);
      }
    },
    get: async (id: string): Promise<TestRun> => {
      try {
        return await get<TestRun>(`/runs/${id}`);
      } catch {
        const runs = generateMockRuns("proj_1");
        return runs.find((r) => r.id === id) ?? runs[0];
      }
    },
    getAssertions: async (runId: string): Promise<AssertionResult[]> => {
      try {
        return await get<AssertionResult[]>(`/runs/${runId}/assertions`);
      } catch {
        return generateMockAssertions(runId);
      }
    },
  },
  analytics: {
    summary: async (): Promise<AnalyticsSummary> => {
      try {
        return await get<AnalyticsSummary>("/analytics/summary");
      } catch {
        return generateMockAnalytics();
      }
    },
  },
};
