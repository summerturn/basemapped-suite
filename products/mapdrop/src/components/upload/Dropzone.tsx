"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, FileText, AlertCircle, X } from "lucide-react";
import type { UploadState } from "@/types/dataset";

interface DropzoneProps {
  state: UploadState;
  onSelectFile: (file: File) => void;
  onReset: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPTED_TYPES = {
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "text/tab-separated-values": [".tsv"],
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls") {
    return <FileSpreadsheet className="h-8 w-8 text-green-600" aria-hidden="true" />;
  }
  return <FileText className="h-8 w-8 text-blue-600" aria-hidden="true" />;
}

export default function Dropzone({ state, onSelectFile, onReset }: DropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onSelectFile(acceptedFiles[0]);
      }
    },
    [onSelectFile]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      maxSize: MAX_FILE_SIZE,
      multiple: false,
      disabled: state.phase === "parsing" || state.phase === "detecting" || state.phase === "uploading",
    });

  const isBusy =
    state.phase === "parsing" ||
    state.phase === "detecting" ||
    state.phase === "uploading";

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Progress bar */}
      {state.phase !== "idle" && state.phase !== "error" && (
        <div className="w-full bg-gray-200 rounded-full h-2.5" role="progressbar" aria-valuenow={state.progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${state.progress}%` }}
          />
        </div>
      )}

      {/* Phase label */}
      {isBusy && (
        <p className="text-sm text-center text-gray-600" aria-live="polite">
          {state.phase === "parsing" && "Parsing file..."}
          {state.phase === "detecting" && "Detecting columns..."}
          {state.phase === "uploading" && "Uploading and creating map..."}
        </p>
      )}

      {/* Dropzone area */}
      {!state.file && (
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-colors duration-200
            ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-white"}
            ${isBusy ? "opacity-60 cursor-not-allowed" : ""}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
          role="button"
          aria-label="File upload dropzone"
          tabIndex={0}
        >
          <input {...getInputProps()} aria-label="Upload file input" />

          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-full">
              <Upload className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900">
                {isDragActive ? "Drop the file here" : "Drag & drop a file here"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                or click to browse
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="px-2 py-1 bg-gray-100 rounded">CSV</span>
              <span className="px-2 py-1 bg-gray-100 rounded">TSV</span>
              <span className="px-2 py-1 bg-gray-100 rounded">XLSX</span>
              <span className="px-2 py-1 bg-gray-100 rounded">XLS</span>
            </div>

            <p className="text-xs text-gray-400">Max file size: 10MB</p>
          </div>
        </div>
      )}

      {/* File rejection errors */}
      {fileRejections.length > 0 && (
        <div
          className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            {fileRejections.map(({ file, errors }, idx) => (
              <div key={idx}>
                <p className="font-medium">{file.name}</p>
                <ul className="list-disc list-inside mt-1">
                  {errors.map((e, i) => (
                    <li key={i}>{e.message}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected file card */}
      {state.file && (
        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          {getFileIcon(state.file.name)}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {state.file.name}
            </p>
            <p className="text-xs text-gray-500">
              {formatBytes(state.file.size)}
              {state.parseResult && (
                <span className="ml-2">
                  • {state.parseResult.rowCount.toLocaleString()} rows
                  {state.parseResult.delimiter && (
                    <span className="ml-1">
                      • delimiter: "{state.parseResult.delimiter === "\t" ? "tab" : state.parseResult.delimiter}"
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>

          {!isBusy && (
            <button
              onClick={onReset}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Remove file"
              title="Remove file"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Global error */}
      {state.error && (
        <div
          className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      )}
    </div>
  );
}
