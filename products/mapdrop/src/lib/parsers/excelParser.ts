import * as XLSX from "xlsx";
import type { ParseResult, ParsedRow } from "@/types/dataset";

const PREVIEW_ROW_COUNT = 10;
const MAX_ROWS_FOR_TYPE_DETECTION = 1000;

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

      if (!isNaN(Number(trimmed)) && isFinite(Number(trimmed))) {
        numberCount++;
        continue;
      }

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

function worksheetToJson(ws: XLSX.WorkSheet): string[][] {
  const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  return json.map((row) => row.map((cell) => String(cell ?? "")));
}

export async function parseExcel(file: File, selectedSheet?: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read Excel file. It may be corrupted."));
    };

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("File is empty."));
          return;
        }

        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const availableSheets = workbook.SheetNames;

        if (availableSheets.length === 0) {
          reject(new Error("Excel file contains no sheets."));
          return;
        }

        const sheetName = selectedSheet && availableSheets.includes(selectedSheet)
          ? selectedSheet
          : availableSheets[0];

        const worksheet = workbook.Sheets[sheetName];
        const rawRows = worksheetToJson(worksheet).filter((row) => row.some((cell) => cell.trim() !== ""));

        if (rawRows.length === 0) {
          reject(new Error(`Sheet "${sheetName}" has no data rows.`));
          return;
        }

        const headers = rawRows[0].map((h) => h.trim());
        const dataRows = rawRows.slice(1);
        const rowCount = dataRows.length;

        const previewRows: ParsedRow[] = [];
        for (let i = 0; i < Math.min(dataRows.length, PREVIEW_ROW_COUNT); i++) {
          const row: ParsedRow = {};
          headers.forEach((header, idx) => {
            row[header] = dataRows[i][idx] ?? null;
          });
          previewRows.push(row);
        }

        // Type inference
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
          sheetName,
          availableSheets,
        });
      } catch (err) {
        reject(new Error(`Excel parsing error: ${err instanceof Error ? err.message : String(err)}`));
      }
    };

    reader.readAsArrayBuffer(file);
  });
}
