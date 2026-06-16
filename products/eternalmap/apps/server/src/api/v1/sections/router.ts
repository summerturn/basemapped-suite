import { Router } from "express";
import { query } from "../../../config/database";
import { AuthRequest, authMiddleware } from "../../../middleware/auth";
import { tenantMiddleware } from "../../../middleware/tenant";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { cemeteryId } = req.query;

    const conditions = ["tenant_id = $1", "deleted_at IS NULL"];
    const values: any[] = [tenantId];
    let idx = 2;

    if (cemeteryId) {
      conditions.push(`cemetery_id = $${idx++}`);
      values.push(cemeteryId);
    }

    const result = await query(
      `SELECT id, cemetery_id, name, code, section_type, total_plots, description,
              ST_AsGeoJSON(boundary) as boundary_geojson,
              ST_AsGeoJSON(center_point) as center_geojson,
              created_at, updated_at
       FROM sections
       WHERE ${conditions.join(" AND ")}
       ORDER BY code`,
      values
    );

    const data = result.rows.map((r) => ({
      ...r,
      boundary: r.boundary_geojson ? JSON.parse(r.boundary_geojson) : null,
      centerPoint: r.center_geojson ? JSON.parse(r.center_geojson) : null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const result = await query(
      `SELECT id, cemetery_id, name, code, section_type, total_plots, description,
              ST_AsGeoJSON(boundary) as boundary_geojson,
              ST_AsGeoJSON(center_point) as center_geojson,
              created_at, updated_at
       FROM sections
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Section not found" });
      return;
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        ...row,
        boundary: row.boundary_geojson ? JSON.parse(row.boundary_geojson) : null,
        centerPoint: row.center_geojson ? JSON.parse(row.center_geojson) : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { cemeteryId, name, code, sectionType, totalPlots, description, boundary, centerPoint } = req.body;

    const result = await query(
      `INSERT INTO sections (tenant_id, cemetery_id, name, code, section_type, total_plots, description, boundary, center_point)
       VALUES ($1,$2,$3,$4,$5,$6,$7, ST_GeomFromGeoJSON($8), ST_GeomFromGeoJSON($9))
       RETURNING *`,
      [tenantId, cemeteryId, name, code, sectionType || "standard", totalPlots || 0, description,
       boundary ? JSON.stringify(boundary) : null,
       centerPoint ? JSON.stringify(centerPoint) : null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const map: Record<string, any> = {
      name: req.body.name,
      code: req.body.code,
      section_type: req.body.sectionType,
      total_plots: req.body.totalPlots,
      description: req.body.description,
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
      `UPDATE sections SET ${fields.join(", ")}, updated_at = NOW()
       WHERE tenant_id = $${idx++} AND id = $${idx++} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Section not found" });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const result = await query(
      `UPDATE sections SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING id`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Section not found" });
      return;
    }

    res.json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
