import { Hono } from "hono";
import type { Bindings } from "../bindings";

const catalogs = new Hono<{ Bindings: Bindings }>();

// ── Specialties ──
catalogs.get("/specialties", async (c) => {
    const result = await c.env.DB.prepare("SELECT * FROM specialties ORDER BY code").all();
    return c.json({ success: true, data: result.results });
});

// ── Groups ──
catalogs.get("/groups", async (c) => {
    const periodId = c.req.query("period_id");
    let query = `
    SELECT g.*, s.name as specialty_name, s.code as specialty_code,
           (SELECT COUNT(*) FROM group_students gs WHERE gs.group_id = g.id) as student_count
    FROM groups_table g
    LEFT JOIN specialties s ON g.specialty_id = s.id
  `;
    const params: number[] = [];

    if (periodId) {
        query += " WHERE g.period_id = ?";
        params.push(Number(periodId));
    }

    query += " ORDER BY g.semester, g.name";
    const stmt = c.env.DB.prepare(query);
    const result = await (params.length ? stmt.bind(...params) : stmt).all();

    return c.json({ success: true, data: result.results });
});

// ── Subjects ──
catalogs.get("/subjects", async (c) => {
    const result = await c.env.DB
        .prepare(`
      SELECT sub.*, s.name as specialty_name, s.code as specialty_code
      FROM subjects sub
      LEFT JOIN specialties s ON sub.specialty_id = s.id
      ORDER BY sub.short_code
    `)
        .all();

    return c.json({ success: true, data: result.results });
});

// ── Schedules (by group) ──
catalogs.get("/schedules", async (c) => {
    const groupId = c.req.query("group_id");
    if (!groupId) return c.json({ success: false, error: "group_id requerido" }, 400);

    const result = await c.env.DB
        .prepare(`
      SELECT s.*, sub.name as subject_name, sub.short_code,
             t.name as teacher_name, t.short_name as teacher_short
      FROM schedules s
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN teachers t ON s.teacher_id = t.id
      WHERE s.group_id = ?
      ORDER BY s.day, s.period_num
    `)
        .bind(Number(groupId))
        .all();

    return c.json({ success: true, data: result.results });
});

export { catalogs as catalogsRoutes };
