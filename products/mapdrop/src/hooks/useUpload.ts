"use client";

import { useState, useCallback } from "react";
import type {
  UploadState,
  UploadPhase,
  ParseResult,
  ColumnMapping,
  GeocodeNeeded,
} from "@/types/dataset";
import { parseCSV } from "@/lib/parsers/csvParser";
import { parseExcel } from "@/lib/parsers/excelParser";
import { detectColumns, checkGeocodeNeeded } from "@/lib/parsers/columnDetector";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const initialState: UploadState = {
  phase: "idle",
  file: null,
  parseResult: null,
  columnMappings: [],
  progress: 0,
  error: null,
  mapId: null,
};

function getPhaseProgress(phase: UploadPhase): number {
  switch (phase) {
    case "idle":
      return 0;
    case "selecting":
      return 5;
    case "parsing":
      return 25;
    case "detecting":
      return 50;
    case "confirming":
      return 60;
    case "uploading":
      return 75;
    case "success":
      return 100;
    case "error":
      return 0;
    default:
      return 0;
  }
}

export function useUpload() {
  const [state, setState] = useState<UploadState>(initialState);

  const setPhase = useCallback((phase: UploadPhase) => {
    setState((prev) => ({
      ...prev,
      phase,
      progress: getPhaseProgress(phase),
      error: phase === "error" ? prev.error : null,
    }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      phase: "error",
      error,
      progress: 0,
    }));
  }, []);

  const selectFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        setError("File exceeds 10MB limit.");
        return;
      }

      setState((prev) => ({
        ...prev,
        file,
        phase: "selecting",
        progress: getPhaseProgress("selecting"),
        error: null,
      }));

      try {
        setPhase("parsing");

        let parseResult: ParseResult;
        const ext = file.name.split(".").pop()?.toLowerCase();

        if (ext === "csv" || ext === "tsv" || ext === "txt") {
          parseResult = await parseCSV(file);
        } else if (ext === "xlsx" || ext === "xls") {
          parseResult = await parseExcel(file);
        } else {
          setError(
            "Unsupported file type. Please upload a CSV, TSV, or Excel file."
          );
          return;
        }

        setPhase("detecting");
        const columnMappings = detectColumns(parseResult);

        setState((prev) => ({
          ...prev,
          parseResult,
          columnMappings,
          phase: "confirming",
          progress: getPhaseProgress("confirming"),
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse file.");
      }
    },
    [setPhase, setError]
  );

  const updateMapping = useCallback(
    (columnIndex: number, userOverride: ColumnMapping["userOverride"]) => {
      setState((prev) => ({
        ...prev,
        columnMappings: prev.columnMappings.map((m) =>
          m.columnIndex === columnIndex ? { ...m, userOverride } : m
        ),
      }));
    },
    []
  );

  const confirmAndUpload = useCallback(
    async (mapName: string) => {
      if (!state.file || !state.parseResult) {
        setError("No file selected or file not parsed.");
        return;
      }

      const geocode = checkGeocodeNeeded(state.columnMappings);

      setPhase("uploading");

      try {
        const formData = new FormData();
        formData.append("file", state.file);
        formData.append("mapName", mapName);
        formData.append("columnMappings", JSON.stringify(state.columnMappings));
        formData.append("geocode", JSON.stringify(geocode));

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Upload failed (${response.status})`);
        }

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          phase: "success",
          progress: 100,
          mapId: data.mapId ?? null,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      }
    },
    [state.file, state.parseResult, state.columnMappings, setPhase, setError]
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    selectFile,
    updateMapping,
    confirmAndUpload,
    reset,
  };
}
