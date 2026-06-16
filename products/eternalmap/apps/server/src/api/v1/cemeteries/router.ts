import { Router } from "express";
import { query } from "../../../config/database";
import { AuthRequest, authMiddleware } from "../../../middleware/auth";
import { tenantMiddleware } from "../../../middleware/tenant";

const router = Router();

// List cemeteries
router.get("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const result = await query(
      `SELECT id, name, code, address, city, state, postal_code, country,
              phone, email, website, total_acres, established_date, timezone,
              ST_AsGeoJSON(boundary) as boundary_geojson,
              ST_AsGeoJSON(center_point) as center_geojson,
              created_at, updated_at
       FROM cemeteries
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY name`,
      [tenantId]
    );

    const data = result.rows.map((r) => ({
      ...r,
      boundary: r.boundary_geojson ? JSON.parse(r.boundary_geojson) : null,
      centerPoint: r.center_geojson ? JSON.parse(r.center_geojson) : null,
      boundary_geojson: undefined,
      center_geojson: undefined,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Get one cemetery
router.get("/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const result = await query(
      `SELECT id, name, code, address, city, state, postal_code, country,
              phone, email, website, total_acres, established_date, timezone,
              ST_AsGeoJSON(boundary) as boundary_geojson,
              ST_AsGeoJSON(center_point) as center_geojson,
              created_at, updated_at
       FROM cemeteries
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Cemetery not found" });
      return;
    }

    const row = result.rows[0];
    const data = {
      ...row,
      boundary: row.boundary_geojson ? JSON.parse(row.boundary_geojson) : null,
      centerPoint: row.center_geojson ? JSON.parse(row.center_geojson) : null,
    };

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Create cemetery
router.post("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const {
      name, code, address, city, state, postalCode, country,
      phone, email, website, totalAcres, establishedDate, timezone,
      boundary, centerPoint,
    } = req.body;

    const result = await query(
      `INSERT INTO cemeteries (
         tenant_id, name, code, address, city, state, postal_code, country,
         phone, email, website, total_acres, established_date, timezone,
         boundary, center_point
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
         ST_GeomFromGeoJSON($15), ST_GeomFromGeoJSON($16)
       ) RETURNING *`,
      [
        tenantId, name, code, address, city, state, postalCode, country,
        phone, email, website, totalAcres, establishedDate, timezone || "America/New_York",
        boundary ? JSON.stringify(boundary) : null,
        centerPoint ? JSON.stringify(centerPoint) : null,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Update cemetery
router.patch("/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const map: Record<string, any> = {
      name: req.body.name,
      code: req.body.code,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      postal_code: req.body.postalCode,
      country: req.body.country,
      phone: req.body.phone,
      email: req.body.email,
      website: req.body.website,
      total_acres: req.body.totalAcres,
      established_date: req.body.establishedDate,
      timezone: req.body.timezone,
    };

    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }

    if (req.body.boundary !== undefined) {
      fields.push(`boundary = ST_GeomFromGeoJSON($${idx++})`);
      values.push(JSON.stringify(req.body.boundary));
    }
    if (req.body.centerPoint !== undefined) {
      fields.push(`center_point = ST_GeomFromGeoJSON($${idx++})`);
      values.push(JSON.stringify(req.body.centerPoint));
    }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: "No fields to update" });
      return;
    }

    values.push(tenantId, req.params.id);
    const result = await query(
      `UPDATE cemeteries SET ${fields.join(", ")}, updated_at = NOW()
       WHERE tenant_id = $${idx++} AND id = $${idx++} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Cemetery not found" });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Soft delete cemetery
router.delete("/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const result = await query(
      `UPDATE cemeteries SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING id`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Cemetery not found" });
      return;
    }

    res.json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

// Spatial search: cemeteries within radius
router.post("/search/nearby", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { lat, lng, radiusMeters = 5000 } = req.body;

    const result = await query(
      `SELECT id, name, code, address, city, state,
              ST_Distance(center_point::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) as distance_meters
       FROM cemeteries
       WHERE tenant_id = $3
         AND deleted_at IS NULL
         AND ST_DWithin(center_point::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $4)
       ORDER BY distance_meters`,
      [lat, lng, tenantId, radiusMeters]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
