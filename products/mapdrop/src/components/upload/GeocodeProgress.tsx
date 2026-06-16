"use client";

import React, { useState, useEffect } from "react";

interface GeocodeStatus {
  id: string;
  mapId: string;
  status: string;
  total: number;
  processed: number;
  failed: number;
  percentComplete: number;
  estimatedSecondsRemaining: number;
  createdAt: string;
  updatedAt: string;
}

interface GeocodeProgressProps {
  jobId: string;
  onComplete?: () => void;
  onRetry?: (jobId: string) => void;
}

export default function GeocodeProgress({
  jobId,
  onComplete,
  onRetry,
}: GeocodeProgressProps) {
  const [status, setStatus] = useState<GeocodeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/geocode/status?jobId=${jobId}`);
        if (!res.ok) throw new Error("Failed to fetch status");
        const data: GeocodeStatus = await res.json();
        setStatus(data);
        setLoading(false);

        if (
          data.status === "completed" ||
          data.status === "failed" ||
          data.status === "partial"
        ) {
          onComplete?.();
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  if (loading) return <div className="p-4">Loading geocode progress...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!status) return null;

  const isDone = ["completed", "failed", "partial"].includes(status.status);
  const successCount = status.processed;
  const failCount = status.failed;

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Geocoding Progress
      </h3>

      <div className="mb-2 flex justify-between text-sm text-gray-600">
        <span>{status.percentComplete}% complete</span>
        <span className="capitalize">{status.status}</span>
      </div>

      <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${status.percentComplete}%` }}
        />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4 text-center">
        <div className="rounded-md bg-gray-50 p-2">
          <div className="text-lg font-bold text-gray-900">{status.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="rounded-md bg-green-50 p-2">
          <div className="text-lg font-bold text-green-700">{successCount}</div>
          <div className="text-xs text-green-600">Processed</div>
        </div>
        <div className="rounded-md bg-red-50 p-2">
          <div className="text-lg font-bold text-red-700">{failCount}</div>
          <div className="text-xs text-red-600">Failed</div>
        </div>
      </div>

      {!isDone && status.estimatedSecondsRemaining > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          Estimated time remaining:{" "}
          <span className="font-medium">
            {formatTime(status.estimatedSecondsRemaining)}
          </span>
        </div>
      )}

      {status.status === "partial" && (
        <button
          onClick={() => onRetry?.(jobId)}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Retry Failed
        </button>
      )}
    </div>
  );
}
