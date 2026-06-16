"use client";

import React, { useState } from "react";
import { MapPin, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import type {
  ColumnMapping,
  ColumnType,
  ParseResult,
  GeocodeNeeded,
} from "@/types/dataset";
import { checkGeocodeNeeded } from "@/lib/parsers/columnDetector";

interface ColumnMatcherProps {
  parseResult: ParseResult;
  columnMappings: ColumnMapping[];
  onUpdateMapping: (columnIndex: number, type: ColumnType | undefined) => void;
  onConfirm: (mapName: string) => void;
  isUploading: boolean;
}

const COLUMN_TYPE_OPTIONS: { value: ColumnType; label: string }[] = [
  { value: "latitude", label: "Latitude" },
  { value: "longitude", label: "Longitude" },
  { value: "address", label: "Street Address" },
  { value: "city", label: "City" },
  { value: "state", label: "State / Province" },
  { value: "zip", label: "Zip / Postal Code" },
  { value: "name", label: "Location Name" },
  { value: "category", label: "Category" },
  { value: "unknown", label: "Ignore / Other" },
];

function getConfidenceBadge(confidence: number) {
  if (confidence >= 80) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        {confidence}%
      </span>
    );
  }
  if (confidence >= 40) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        {confidence}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
      Guess
    </span>
  );
}

function getGeocodeBanner(geocode: GeocodeNeeded) {
  if (!geocode.needed) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Lat/Lng columns detected. Your map will be created instantly.</span>
      </div>
    );
  }

  if (geocode.reason === "address_found") {
    return (
      <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        <MapPin className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium">Geocoding required</p>
          <p className="mt-0.5">
            Address data detected. We will geocode your locations during upload.
            {geocode.missingFields.length > 0 && (
              <span className="block mt-1 text-yellow-700">
                Optional fields not found: {geocode.missingFields.join(", ")}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium">Insufficient location data</p>
        <p className="mt-0.5">
          We could not detect latitude/longitude or address columns. Please map at least one location field above.
        </p>
      </div>
    </div>
  );
}

export default function ColumnMatcher({
  parseResult,
  columnMappings,
  onUpdateMapping,
  onConfirm,
  isUploading,
}: ColumnMatcherProps) {
  const [mapName, setMapName] = useState("");
  const geocode = checkGeocodeNeeded(columnMappings);

  const hasLocationData =
    columnMappings.some(
      (m) => (m.userOverride ?? m.detectedType) === "latitude"
    ) &&
    columnMappings.some(
      (m) => (m.userOverride ?? m.detectedType) === "longitude"
    );

  const hasAddressData =
    columnMappings.some(
      (m) => (m.userOverride ?? m.detectedType) === "address"
    ) ||
    (columnMappings.some(
      (m) => (m.userOverride ?? m.detectedType) === "city"
    ) &&
      columnMappings.some(
        (m) => (m.userOverride ?? m.detectedType) === "state"
      ));

  const canCreate = (hasLocationData || hasAddressData) && mapName.trim().length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-900">
          Match Columns
        </h2>
        <p className="text-sm text-gray-500">
          Review the detected columns and adjust mappings if needed.
        </p>
      </div>

      {/* Preview table */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {parseResult.headers.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap border-b border-gray-200"
                >
                  {header}
                  {parseResult.columnTypes[header] && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      ({parseResult.columnTypes[header]})
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parseResult.previewRows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100 last:border-0">
                {parseResult.headers.map((header) => (
                  <td
                    key={header}
                    className="px-4 py-2 text-gray-600 whitespace-nowrap"
                  >
                    {row[header] != null ? String(row[header]) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {parseResult.rowCount > parseResult.previewRows.length && (
          <p className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-200">
            Showing {parseResult.previewRows.length} of{" "}
            {parseResult.rowCount.toLocaleString()} rows
          </p>
        )}
      </div>

      {/* Column mappings */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Column Mapping</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {columnMappings.map((mapping) => {
            const activeType = mapping.userOverride ?? mapping.detectedType;
            return (
              <div
                key={mapping.columnIndex}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="min-w-0 mr-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {mapping.header}
                  </p>
                  <div className="mt-1">{getConfidenceBadge(mapping.confidence)}</div>
                </div>

                <div className="relative">
                  <select
                    value={activeType}
                    onChange={(e) => {
                      const value = e.target.value as ColumnType;
                      onUpdateMapping(
                        mapping.columnIndex,
                        value === "unknown" ? undefined : value
                      );
                    }}
                    className="appearance-none bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-40 p-2 pr-8"
                    aria-label={`Map column ${mapping.header}`}
                  >
                    {COLUMN_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Geocode status */}
      {getGeocodeBanner(geocode)}

      {/* Map name + confirm */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2">
        <div className="flex-1">
          <label
            htmlFor="map-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Map Name
          </label>
          <input
            id="map-name"
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder="e.g., Q3 Store Locations"
            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            aria-required="true"
          />
        </div>

        <button
          onClick={() => onConfirm(mapName.trim())}
          disabled={!canCreate || isUploading}
          className={`
            inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors
            ${
              canCreate && !isUploading
                ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }
          `}
          aria-label="Create map"
        >
          {isUploading ? (
            <>
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
              Creating...
            </>
          ) : (
            <>Looks good, create map</>
          )}
        </button>
      </div>

      {!canCreate && mapName.trim().length > 0 && (
        <p className="text-xs text-red-600" role="alert">
          Please map at least a latitude & longitude pair, or an address/city combination.
        </p>
      )}
    </div>
  );
}
