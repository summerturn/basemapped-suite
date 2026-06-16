import { Router } from "express";
import { AuthRequest, authMiddleware } from "../../../middleware/auth";
import { tenantMiddleware } from "../../../middleware/tenant";
import {
  occupancyReport,
  burialRegisterReport,
  availablePlotsReport,
  generateCSV,
  generatePDFPlaceholder,
} from "./service";

const router = Router();

router.get("/occupancy", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { cemeteryId } = req.query;
    const data = await occupancyReport(tenantId, cemeteryId as string | undefined);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/burial-register", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { from, to } = req.query;
    if (!from || !to) {
      res.status(400).json({ success: false, error: "from and to dates are required" });
      return;
    }
    const data = await burialRegisterReport(tenantId, from as string, to as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/available-plots", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { cemeteryId } = req.query;
    const data = await availablePlotsReport(tenantId, cemeteryId as string | undefined);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get("/occupancy/export/:format", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { cemeteryId } = req.query;
    const data = await occupancyReport(tenantId, cemeteryId as string | undefined);
    const format = req.params.format;

    if (format === "csv") {
      const csv = generateCSV(data, [
        "section_id", "section_name", "total_plots", "occupied",
        "available", "reserved", "maintenance", "occupancy_rate",
      ]);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=occupancy-report.csv");
      res.send(csv);
      return;
    }

    if (format === "pdf") {
      const pdf = generatePDFPlaceholder(data, "Occupancy Report");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=occupancy-report.pdf");
      res.send(pdf);
      return;
    }

    res.status(400).json({ success: false, error: "Unsupported format" });
  } catch (err) {
    next(err);
  }
});

router.get("/burial-register/export/:format", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { from, to } = req.query;
    if (!from || !to) {
      res.status(400).json({ success: false, error: "from and to dates are required" });
      return;
    }
    const data = await burialRegisterReport(tenantId, from as string, to as string);
    const format = req.params.format;

    if (format === "csv") {
      const csv = generateCSV(data, [
        "grave_id", "plot_number", "section_name", "first_name",
        "last_name", "date_of_burial", "date_of_death", "date_of_birth",
      ]);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=burial-register.csv");
      res.send(csv);
      return;
    }

    if (format === "pdf") {
      const pdf = generatePDFPlaceholder(data, "Burial Register");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=burial-register.pdf");
      res.send(pdf);
      return;
    }

    res.status(400).json({ success: false, error: "Unsupported format" });
  } catch (err) {
    next(err);
  }
});

export default router;
