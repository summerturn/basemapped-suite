import { Router } from "express";
import { query } from "../../../config/database";
import { AuthRequest, authMiddleware } from "../../../middleware/auth";
import { tenantMiddleware } from "../../../middleware/tenant";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const { q, personType } = req.query;

    const conditions = ["tenant_id = $1", "deleted_at IS NULL"];
    const values: any[] = [tenantId];
    let idx = 2;

    if (personType) {
      conditions.push(`person_type = $${idx++}`);
      values.push(personType);
    }

    if (q) {
      conditions.push(`(
        first_name ILIKE $${idx} OR
        last_name ILIKE $${idx} OR
        middle_name ILIKE $${idx} OR
        maiden_name ILIKE $${idx}
      )`);
      values.push(`%${q}%`);
      idx++;
    }

    const result = await query(
      `SELECT id, first_name, last_name, middle_name, maiden_name, person_type,
              date_of_birth, date_of_death, date_of_burial, birth_place, death_place,
              bio, religion, military_branch, military_rank, obituary_url,
              contact_email, contact_phone, address,
              created_at, updated_at
       FROM persons
       WHERE ${conditions.join(" AND ")}
       ORDER BY last_name, first_name`,
      values
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const result = await query(
      `SELECT id, first_name, last_name, middle_name, maiden_name, person_type,
              date_of_birth, date_of_death, date_of_burial, birth_place, death_place,
              bio, religion, military_branch, military_rank, obituary_url,
              contact_email, contact_phone, address,
              created_at, updated_at
       FROM persons
       WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Person not found" });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post("/", authMiddleware, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] as string;
    const {
      firstName, lastName, middleName, maidenName, personType,
      dateOfBirth, dateOfDeath, dateOfBurial, birthPlace, deathPlace,
      bio, religion, militaryBranch, militaryRank, obituaryUrl,
      contactEmail, contactPhone, address,
    } = req.body;

    const result = await query(
      `INSERT INTO persons (
         tenant_id, first_name, last_name, middle_name, maiden_name, person_type,
         date_of_birth, date_of_death, date_of_burial, birth_place, death_place,
         bio, religion, military_branch, military_rank, obituary_url,
         contact_email, contact_phone, address
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        tenantId, firstName, lastName, middleName, maidenName,
        personType || "deceased", dateOfBirth, dateOfDeath, dateOfBurial,
        birthPlace, deathPlace, bio, religion, militaryBranch, militaryRank,
        obituaryUrl, contactEmail, contactPhone, address,
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
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      middle_name: req.body.middleName,
      maiden_name: req.body.maidenName,
      person_type: req.body.personType,
      date_of_birth: req.body.dateOfBirth,
      date_of_death: req.body.dateOfDeath,
      date_of_burial: req.body.dateOfBurial,
      birth_place: req.body.birthPlace,
      death_place: req.body.deathPlace,
      bio: req.body.bio,
      religion: req.body.religion,
      military_branch: req.body.militaryBranch,
      military_rank: req.body.militaryRank,
      obituary_url: req.body.obituaryUrl,
      contact_email: req.body.contactEmail,
      contact_phone: req.body.contactPhone,
      address: req.body.address,
    };

    for (const [col, val] of Object.entries(map)) {
      if (val !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: "No fields to update" });
      return;
    }

    values.push(tenantId, req.params.id);
    const result = await query(
      `UPDATE persons SET ${fields.join(", ")}, updated_at = NOW()
       WHERE tenant_id = $${idx++} AND id = $${idx++} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Person not found" });
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
      `UPDATE persons SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING id`,
      [tenantId, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: "Person not found" });
      return;
    }

    res.json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
