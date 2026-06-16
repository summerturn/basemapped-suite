import { Router } from "express";
import { query } from "../../../config/database";
import { AuthRequest, authMiddleware } from "../../../middleware/auth";
import { tenantMiddleware } from "../../../middleware/tenant";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { plotId, personId } = req.query;

    const conditions = ["g.tenant_id = $1", "g.deleted_at IS NULL"];
    const values: any[] = [tenantId];
    let idx = 2;

    if (plotId) {
      conditions.push(`g.plot_id = $${idx++}`);
      values.push(plotId);
    }
    if (personId) {
      conditions.push(`g.person_id = $${idx++}`);
      values.push(personId);
    }

    const result = await query(
      `SELECT g.id, g.plot_id, g.person_id, g.grave_number, g.depth,
              g.headstone_type, g.headstone_inscription, g.headstone_material,
              g.has_vase, g.has_lights, g.has_photo, g.condition, g.condition_notes,
              g.burial_date, g.exhumed_date,
              ST_AsGeoJSON(g.gps_location) as gps_geojson,
              p.first_name as person_first_name, p.last_name as person_last_name,
              pl.plot_number, s.name as section_name,
              g.created_at, g.updated_at
       FROM graves g
       LEFT JOIN persons p ON p.id = g.person_id
       LEFT JOIN plots pl ON pl.id = g.plot_id
       LEFT JOIN sections s ON s.id = pl.section_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY g.grave_number`,
      values
    );

    const data = result.rows.map((r) => ({
      ...r,
      gpsLocation: r.gps_geojson ? JSON.parse(r.gps_geojson) : null,
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
      `SELECT g.id, g.plot_id, g.person_id, g.grave_number, g.depth,
              g.headstone_type, g.headstone_inscription, g.headstone_material,
              g.has_vase, g.has_lights, g.has_photo, g.condition, g.condition_notes,
              g.burial_date, g.exhumed_date,
              ST_AsGeoJSON(g.gps_location) as gps_geojson,
              g.created_at, g.updated_at
       FROM graves g
       WHERE g.tenant_id = $1 AND g.id = $2 AND g.deleted_at IS NULL`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Grave not found" });
      return;
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        ...row,
        gpsLocation: row.gps_geojson ? JSON.parse(row.gps_geojson) : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const {
      plotId, personId, graveNumber, depth,
      headstoneType, headstoneInscription, headstoneMaterial,
      hasVase, hasLights, hasPhoto, condition, conditionNotes,
      burialDate, exhumedDate, gpsLocation,
    } = req.body;

    const result = await query(
      `INSERT INTO graves (
         tenant_id, plot_id, person_id, grave_number, depth,
         headstone_type, headstone_inscription, headstone_material,
         has_vase, has_lights, has_photo, condition, condition_notes,
         burial_date, exhumed_date, gps_location
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
         ST_GeomFromGeoJSON($16)
       ) RETURNING *`,
      [
        tenantId, plotId, personId, graveNumber, depth,
        headstoneType, headstoneInscription, headstoneMaterial,
        hasVase ?? false, hasLights ?? false, hasPhoto ?? false,
        condition || "good", conditionNotes, burialDate, exhumedDate,
        gpsLocation ? JSON.stringify(gpsLocation) : null,
      ]
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
      plot_id: req.body.plotId,
      person_id: req.body.personId,
      grave_number: req.body.graveNumber,
      depth: req.body.depth,
      headstone_type: req.body.headstoneType,
      headstone_inscription: req.body.headstoneInscription,
      headstone_material: req.body.headstoneMaterial,
      has_vase: req.body.hasVase,
      has_lights: req.body.hasLights,
      has_photo: req.body.hasPhoto,
      condition: req.body.condition,
      condition_notes: req.body.conditionNotes,
      burial_date: req.body.burialDate,
      exhumed_date: req.body.exhumedDate,
    };

    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }

    if (req.body.gpsLocation !== undefined) {
      fields.push(`gps_location = ST_GeomFromGeoJSON($${idx++})`);
      values.push(JSON.stringify(req.body.gpsLocation));
    }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: "No fields to update" });
      return;
    }

    values.push(tenantId, req.params.id);
    const result = await query(
      `UPDATE graves SET ${fields.join(", ")}, updated_at = NOW()
       WHERE tenant_id = $${idx++} AND id = $${idx++} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Grave not found" });
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
      `UPDATE graves SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING id`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Grave not found" });
      return;
    }

    res.json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
