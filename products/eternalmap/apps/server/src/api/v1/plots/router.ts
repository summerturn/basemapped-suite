import { Router } from "express";
import { query } from "../../../config/database";
import { AuthRequest, authMiddleware, requireRole } from "../../../middleware/auth";
import { tenantMiddleware } from "../../../middleware/tenant";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { cemeteryId, sectionId, status } = req.query;

    const conditions = ["tenant_id = $1", "deleted_at IS NULL"];
    const values: any[] = [tenantId];
    let idx = 2;

    if (cemeteryId) {
      conditions.push(`cemetery_id = $${idx++}`);
      values.push(cemeteryId);
    }
    if (sectionId) {
      conditions.push(`section_id = $${idx++}`);
      values.push(sectionId);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }

    const result = await query(
      `SELECT id, cemetery_id, section_id, plot_number, row_number, plot_type, status,
              depth, width, length, price, currency, max_occupants, current_occupants,
              orientation, has_vault, is_corner_plot, notes,
              ST_AsGeoJSON(boundary) as boundary_geojson,
              ST_AsGeoJSON(center_point) as center_geojson,
              created_at, updated_at
       FROM plots
       WHERE ${conditions.join(" AND ")}
       ORDER BY plot_number`,
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
      `SELECT id, cemetery_id, section_id, plot_number, row_number, plot_type, status,
              depth, width, length, price, currency, max_occupants, current_occupants,
              orientation, has_vault, is_corner_plot, notes,
              ST_AsGeoJSON(boundary) as boundary_geojson,
              ST_AsGeoJSON(center_point) as center_geojson,
              created_at, updated_at
       FROM plots
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Plot not found" });
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

router.post("/", authMiddleware, tenantMiddleware, requireRole("admin", "manager"), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const {
      cemeteryId, sectionId, plotNumber, rowNumber, plotType, status,
      depth, width, length, price, currency, maxOccupants, orientation,
      hasVault, isCornerPlot, notes, boundary, centerPoint,
    } = req.body;

    const result = await query(
      `INSERT INTO plots (
         tenant_id, cemetery_id, section_id, plot_number, row_number, plot_type, status,
         depth, width, length, price, currency, max_occupants, orientation,
         has_vault, is_corner_plot, notes, boundary, center_point
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
         ST_GeomFromGeoJSON($18), ST_GeomFromGeoJSON($19)
       ) RETURNING *`,
      [
        tenantId, cemeteryId, sectionId, plotNumber, rowNumber,
        plotType || "single", status || "available",
        depth, width, length, price, currency || "USD", maxOccupants || 1, orientation,
        hasVault ?? false, isCornerPlot ?? false, notes,
        boundary ? JSON.stringify(boundary) : null,
        centerPoint ? JSON.stringify(centerPoint) : null,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", authMiddleware, tenantMiddleware, requireRole("admin", "manager"), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const map: Record<string, any> = {
      plot_number: req.body.plotNumber,
      row_number: req.body.rowNumber,
      plot_type: req.body.plotType,
      status: req.body.status,
      depth: req.body.depth,
      width: req.body.width,
      length: req.body.length,
      price: req.body.price,
      currency: req.body.currency,
      max_occupants: req.body.maxOccupants,
      orientation: req.body.orientation,
      has_vault: req.body.hasVault,
      is_corner_plot: req.body.isCornerPlot,
      notes: req.body.notes,
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
      `UPDATE plots SET ${fields.join(", ")}, updated_at = NOW()
       WHERE tenant_id = $${idx++} AND id = $${idx++} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Plot not found" });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    if (err.message?.includes("Plot already reserved or occupied") || err.message?.includes("max occupants reached")) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    next(err);
  }
});

router.delete("/:id", authMiddleware, tenantMiddleware, requireRole("admin", "manager"), async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const result = await query(
      `UPDATE plots SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING id`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Plot not found" });
      return;
    }

    res.json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
