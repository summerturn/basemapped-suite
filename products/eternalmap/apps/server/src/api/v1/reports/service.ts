import { query } from "../../../config/database";

export interface OccupancyRow {
  section_id: string;
  section_name: string;
  total_plots: number;
  occupied: number;
  available: number;
  reserved: number;
  maintenance: number;
  occupancy_rate: number;
}

export async function occupancyReport(tenantId: string, cemeteryId?: string): Promise<OccupancyRow[]> {
  const conditions = ["p.tenant_id = $1", "p.deleted_at IS NULL"];
  const values: any[] = [tenantId];
  let idx = 2;

  if (cemeteryId) {
    conditions.push(`p.cemetery_id = $${idx++}`);
    values.push(cemeteryId);
  }

  const result = await query<OccupancyRow>(
    `SELECT
       s.id as section_id,
       s.name as section_name,
       COUNT(*)::int as total_plots,
       COUNT(*) FILTER (WHERE p.status = 'occupied')::int as occupied,
       COUNT(*) FILTER (WHERE p.status = 'available')::int as available,
       COUNT(*) FILTER (WHERE p.status = 'reserved')::int as reserved,
       COUNT(*) FILTER (WHERE p.status = 'maintenance')::int as maintenance,
       ROUND(COUNT(*) FILTER (WHERE p.status = 'occupied') * 100.0 / NULLIF(COUNT(*), 0), 2) as occupancy_rate
     FROM plots p
     JOIN sections s ON s.id = p.section_id
     WHERE ${conditions.join(" AND ")}
     GROUP BY s.id, s.name
     ORDER BY s.name`,
    values
  );

  return result.rows;
}

export interface BurialRegisterRow {
  grave_id: string;
  plot_number: string;
  section_name: string;
  first_name: string;
  last_name: string;
  date_of_burial: string;
  date_of_death: string;
  date_of_birth: string;
}

export async function burialRegisterReport(
  tenantId: string,
  fromDate: string,
  toDate: string
): Promise<BurialRegisterRow[]> {
  const result = await query<BurialRegisterRow>(
    `SELECT
       g.id as grave_id,
       p.plot_number,
       s.name as section_name,
       pe.first_name,
       pe.last_name,
       pe.date_of_burial,
       pe.date_of_death,
       pe.date_of_birth
     FROM graves g
     JOIN plots p ON p.id = g.plot_id
     JOIN sections s ON s.id = p.section_id
     JOIN persons pe ON pe.id = g.person_id
     WHERE g.tenant_id = $1
       AND g.deleted_at IS NULL
       AND pe.date_of_burial BETWEEN $2 AND $3
     ORDER BY pe.date_of_burial DESC`,
    [tenantId, fromDate, toDate]
  );

  return result.rows;
}

export interface AvailablePlotRow {
  id: string;
  plot_number: string;
  section_name: string;
  plot_type: string;
  price: number;
  currency: string;
  depth: number;
  width: number;
  length: number;
  max_occupants: number;
}

export async function availablePlotsReport(tenantId: string, cemeteryId?: string): Promise<AvailablePlotRow[]> {
  const conditions = ["tenant_id = $1", "status = 'available'", "deleted_at IS NULL"];
  const values: any[] = [tenantId];
  let idx = 2;

  if (cemeteryId) {
    conditions.push(`cemetery_id = $${idx++}`);
    values.push(cemeteryId);
  }

  const result = await query<AvailablePlotRow>(
    `SELECT
       p.id, p.plot_number, s.name as section_name,
       p.plot_type, p.price, p.currency,
       p.depth, p.width, p.length, p.max_occupants
     FROM plots p
     JOIN sections s ON s.id = p.section_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.name, p.plot_number`,
    values
  );

  return result.rows;
}

export function generateCSV(rows: Record<string, any>[], columns: string[]): string {
  if (rows.length === 0) return "";
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col] ?? "";
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export function generatePDFPlaceholder(_rows: Record<string, any>[], _title: string): Buffer {
  // In production, use a library like puppeteer or pdfkit
  // Returning a minimal text buffer as placeholder
  return Buffer.from("PDF generation placeholder - integrate pdfkit/puppeteer in production");
}
