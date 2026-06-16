import { Router } from "express";
import multer from "multer";
import path from "path";
import { query } from "../../../config/database";
import { AuthRequest, authMiddleware } from "../../../middleware/auth";
import { tenantMiddleware } from "../../../middleware/tenant";

const upload = multer({ dest: "uploads/" });
const router = Router();

// Presigned URL simulation (replace with real MinIO SDK in production)
function generatePresignedUrl(storageKey: string): string {
  const { MINIO_ENDPOINT, MINIO_PORT, MINIO_USE_SSL } = process.env;
  const protocol = MINIO_USE_SSL === "true" ? "https" : "http";
  return `${protocol}://${MINIO_ENDPOINT}:${MINIO_PORT}/${process.env.MINIO_BUCKET || "eternalmap"}/${storageKey}?X-Presigned=1`;
}

router.get("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { entityType, entityId } = req.query;

    const conditions = ["tenant_id = $1", "deleted_at IS NULL"];
    const values: any[] = [tenantId];
    let idx = 2;

    if (entityType) {
      conditions.push(`entity_type = $${idx++}`);
      values.push(entityType);
    }
    if (entityId) {
      conditions.push(`entity_id = $${idx++}`);
      values.push(entityId);
    }

    const result = await query(
      `SELECT id, entity_type, entity_id, file_name, file_size, mime_type, storage_key,
              caption, taken_at, is_primary, created_at, updated_at
       FROM photos
       WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC`,
      values
    );

    const data = result.rows.map((r) => ({
      ...r,
      url: generatePresignedUrl(r.storage_key),
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
      `SELECT id, entity_type, entity_id, file_name, file_size, mime_type, storage_key,
              caption, taken_at, is_primary, created_at, updated_at
       FROM photos
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Photo not found" });
      return;
    }

    const row = result.rows[0];
    res.json({ success: true, data: { ...row, url: generatePresignedUrl(row.storage_key) } });
  } catch (err) {
    next(err);
  }
});

router.post("/",
  authMiddleware,
  tenantMiddleware,
  upload.single("file"),
  async (req: AuthRequest, res, next) => {
    try {
      const tenantId = req.headers["x-tenant-id"] as string;
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: "No file uploaded" });
        return;
      }

      const { entityType, entityId, caption, takenAt, gpsLocation } = req.body;
      const storageKey = `photos/${tenantId}/${entityType}/${entityId}/${Date.now()}-${file.originalname}`;

      const result = await query(
        `INSERT INTO photos (
           tenant_id, entity_type, entity_id, file_name, file_size, mime_type,
           storage_key, caption, taken_at, uploaded_by, gps_location
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, ST_GeomFromGeoJSON($11))
         RETURNING *`,
        [
          tenantId, entityType, entityId, file.originalname, file.size,
          file.mimetype, storageKey, caption, takenAt || null, req.user?.id || null,
          gpsLocation ? JSON.stringify(gpsLocation) : null,
        ]
      );

      const row = result.rows[0];
      res.status(201).json({ success: true, data: { ...row, url: generatePresignedUrl(row.storage_key) } });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const result = await query(
      `UPDATE photos SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING id`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Photo not found" });
      return;
    }

    res.json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
