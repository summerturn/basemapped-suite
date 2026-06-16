import { Response, NextFunction } from "express";
import { query } from "../config/database";
import { AuthRequest } from "./auth";

export async function tenantMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const tenantId = req.headers["x-tenant-id"] as string | undefined;

  if (!tenantId) {
    res.status(400).json({ success: false, error: "Missing x-tenant-id header" });
    return;
  }

  try {
    const result = await query(
      `SELECT id, subscription_status, subscription_expires_at
       FROM tenants
       WHERE id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Tenant not found" });
      return;
    }

    const tenant = result.rows[0];
    if (tenant.subscription_status !== "active") {
      res.status(403).json({ success: false, error: "Tenant subscription is not active" });
      return;
    }

    if (
      tenant.subscription_expires_at &&
      new Date(tenant.subscription_expires_at) < new Date()
    ) {
      res.status(403).json({ success: false, error: "Tenant subscription has expired" });
      return;
    }

    // Attach tenant to request for downstream use
    (req as any).tenant = { id: tenant.id };
    next();
  } catch (err) {
    next(err);
  }
}
