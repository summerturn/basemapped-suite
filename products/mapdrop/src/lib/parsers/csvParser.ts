import Papa from "papaparse";
import type { ParseResult, ParsedRow } from "@/types/dataset";

const DELIMITER_CANDIDATES = [",", "\t", ";", "|"];
const PREVIEW_ROW_COUNT = 10;
const MAX_ROWS_FOR_TYPE_DETECTION = 1000;

function detectDelimiter(fileContent: string): string {
  const firstNLines = fileContent.split(/\r?\n/).slice(0, 5).join("\n");

  let bestDelimiter = ",";
  let maxCols = 0;

  for (const delim of DELIMITER_CANDIDATES) {
    const result = Papa.parse(firstNLines, {
      delimiter: delim,
      preview: 1,
      skipEmptyLines: true,
    });
    const colCount = result.data && Array.isArray(result.data[0]) ? result.data[0].length : 0;
    if (colCount > maxCols) {
      maxCols = colCount;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

function inferColumnTypes(rows: Record<string, string>[], headers: string[]): Record<string, "string" | "number" | "date"> {
  const types: Record<string, "string" | "number" | "date"> = {};

  for (const header of headers) {
    let numberCount = 0;
    let dateCount = 0;
    let nonEmptyCount = 0;
    const sampleSize = Math.min(rows.length, MAX_ROWS_FOR_TYPE_DETECTION);

    for (let i = 0; i < sampleSize; i++) {
      const raw = rows[i]?.[header];
      if (raw == null || raw === "") continue;
      nonEmptyCount++;

      const trimmed = String(raw).trim();
      if (trimmed === "") continue;

      // Number detection
      if (!isNaN(Number(trimmed)) && isFinite(Number(trimmed))) {
        numberCount++;
        continue;
      }

      // Date detection (ISO or common formats)
      const date = new Date(trimmed);
      if (!isNaN(date.getTime()) && /\d{4}/.test(trimmed)) {
        dateCount++;
      }
    }

    if (nonEmptyCount === 0) {
      types[header] = "string";
    } else if (numberCount / nonEmptyCount > 0.8) {
      types[header] = "number";
    } else if (dateCount / nonEmptyCount > 0.8) {
      types[header] = "date";
    } else {
      types[header] = "string";
    }
  }

  return types;
}

export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read file. It may be corrupted or use an unsupported encoding."));
    };

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          reject(new Error("File is empty or contains no readable data."));
          return;
        }

        // Check for binary/null byte corruption common in wrong-encoding files
        if (text.includes("\u0000") && !file.name.toLowerCase().endsWith(".csv")) {
          reject(new Error("File appears to be binary or uses an unsupported encoding."));
          return;
        }

        const delimiter = detectDelimiter(text);

        let rowCount = 0;
        const previewRows: ParsedRow[] = [];

        Papa.parse<string[]>(text, {
          delimiter,
          skipEmptyLines: true,
          complete: (results) => {
            if (!results.data || results.data.length === 0) {
              reject(new Error("CSV has no data rows."));
              return;
            }

            const headers = results.data[0].map((h) => h.trim());
            const dataRows = results.data.slice(1);
            rowCount = dataRows.length;

            for (let i = 0; i < Math.min(dataRows.length, PREVIEW_ROW_COUNT); i++) {
              const row: ParsedRow = {};
              headers.forEach((header, idx) => {
                row[header] = dataRows[i][idx] ?? null;
              });
              previewRows.push(row);
            }

            // Convert to object rows for type inference
            const objectRows: Record<string, string>[] = [];
            for (let i = 0; i < Math.min(dataRows.length, MAX_ROWS_FOR_TYPE_DETECTION); i++) {
              const row: Record<string, string> = {};
              headers.forEach((header, idx) => {
                row[header] = dataRows[i][idx] ?? "";
              });
              objectRows.push(row);
            }

            const columnTypes = inferColumnTypes(objectRows, headers);

            resolve({
              headers,
              previewRows,
              rowCount,
              columnTypes,
              delimiter,
            });
          },
          error: (err: Error) => {
            reject(new Error(`CSV parsing error: ${err.message}`));
          },
        });
      } catch (err) {
        reject(new Error(`Unexpected error during CSV parsing: ${err instanceof Error ? err.message : String(err)}`));
      }
    };

    reader.readAsText(file);
  });
}
