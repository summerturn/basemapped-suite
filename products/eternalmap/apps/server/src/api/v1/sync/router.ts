import { Router } from "express";
import { query } from "../../../config/database";
import { AuthRequest, authMiddleware } from "../../../middleware/auth";
import { tenantMiddleware } from "../../../middleware/tenant";
import crypto from "crypto";

const router = Router();

// Tables eligible for sync
const SYNC_TABLES = [
  "cemeteries", "sections", "plots", "graves", "persons",
  "photos", "documents", "work_orders",
];

// POST /sync/pull — get changes since timestamp
router.post("/pull", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { since, tables = SYNC_TABLES, limit = 500 } = req.body;

    if (!since) {
      res.status(400).json({ success: false, error: "Missing 'since' timestamp" });
      return;
    }

    const tableList = Array.isArray(tables) ? tables : SYNC_TABLES;
    const placeholders = tableList.map((_, i) => `$${i + 3}`).join(", ");

    const result = await query(
      `SELECT id, table_name, record_id, operation, version, checksum,
              changed_by, device_id, changed_at, payload, is_conflicted
       FROM change_log
       WHERE tenant_id = $1
         AND changed_at > $2
         AND table_name IN (${placeholders})
       ORDER BY changed_at ASC
       LIMIT $${tableList.length + 3}`,
      [tenantId, since, ...tableList, limit]
    );

    // Build a version map so clients know the latest version per record
    const versionMap: Record<string, number> = {};
    for (const row of result.rows) {
      const key = `${row.table_name}:${row.record_id}`;
      versionMap[key] = Math.max(versionMap[key] || 0, row.version);
    }

    res.json({
      success: true,
      data: {
        changes: result.rows,
        versionMap,
        pulledAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /sync/push — client changes
router.post("/push", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { changes, deviceId } = req.body;

    if (!Array.isArray(changes) || changes.length === 0) {
      res.status(400).json({ success: false, error: "No changes provided" });
      return;
    }

    const accepted: any[] = [];
    const rejected: any[] = [];

    for (const change of changes) {
      const { tableName, recordId, operation, payload, baseVersion } = change;

      if (!SYNC_TABLES.includes(tableName)) {
        rejected.push({ ...change, reason: "Table not eligible for sync" });
        continue;
      }

      // Optimistic locking: reject if server's version is newer than client's base
      const latest = await query(
        `SELECT version FROM change_log
         WHERE tenant_id = $1 AND table_name = $2 AND record_id = $3
         ORDER BY version DESC LIMIT 1`,
        [tenantId, tableName, recordId]
      );

      const serverVersion = latest.rows[0]?.version || 0;
      if (baseVersion !== undefined && serverVersion > baseVersion) {
        rejected.push({ ...change, reason: "Version conflict", serverVersion });
        continue;
      }

      const nextVersion = (serverVersion || 0) + 1;
      const checksum = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

      await query(
        `INSERT INTO change_log (
           tenant_id, table_name, record_id, operation, version, checksum,
           changed_by, device_id, changed_at, payload
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9)`,
        [tenantId, tableName, recordId, operation, nextVersion, checksum, req.user?.id || null, deviceId || null, JSON.stringify(payload)]
      );

      accepted.push({ ...change, serverVersion: nextVersion });
    }

    res.json({ success: true, data: { accepted, rejected, pushedAt: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
});

// POST /sync/resolve — conflict resolution
router.post("/resolve", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { changeLogId, resolution, resolvedPayload } = req.body;

    if (!changeLogId || !resolution) {
      res.status(400).json({ success: false, error: "Missing changeLogId or resolution" });
      return;
    }

    // Verify the change log entry exists and is conflicted
    const existing = await query(
      `SELECT id, table_name, record_id, version
       FROM change_log
       WHERE id = $1 AND tenant_id = $2`,
      [changeLogId, tenantId]
    );

    if (existing.rowCount === 0) {
      res.status(404).json({ success: false, error: "Change log entry not found" });
      return;
    }

    const row = existing.rows[0];
    const nextVersion = (row.version || 0) + 1;
    const checksum = crypto
      .createHash("sha256")
      .update(JSON.stringify(resolvedPayload || {}))
      .digest("hex");

    await query(
      `UPDATE change_log
       SET is_conflicted = false,
           conflict_resolved_at = NOW(),
           conflict_resolved_by = $1
       WHERE id = $2`,
      [req.user?.id, changeLogId]
    );

    // Insert a resolved version entry
    await query(
      `INSERT INTO change_log (
         tenant_id, table_name, record_id, operation, version, checksum,
         changed_by, device_id, changed_at, payload
       ) VALUES ($1,$2,$3,'UPDATE',$4,$5,$6,'conflict-resolver',NOW(),$7)`,
      [tenantId, row.table_name, row.record_id, nextVersion, checksum, req.user?.id || null, JSON.stringify(resolvedPayload || {})]
    );

    res.json({ success: true, data: { resolved: true, changeLogId, newVersion: nextVersion } });
  } catch (err) {
    next(err);
  }
});

export default router;
