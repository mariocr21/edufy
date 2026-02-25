import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Bindings } from "../bindings";

const teachers = new Hono<{ Bindings: Bindings }>();

const teacherSchema = z.object({
    name: z.string().min(1),
    short_name: z.string().min(1),
    specialty: z.string().optional().nullable(),
});

// ── GET /api/teachers ──
teachers.get("/", async (c) => {
    const db = c.env.DB;
    const search = c.req.query("search");

    let query = "SELECT * FROM teachers";
    const params: string[] = [];

    if (search) {
        query += " WHERE name LIKE ? OR short_name LIKE ?";
        const s = `%${search}%`;
        params.push(s, s);
    }

    query += " ORDER BY name";

    const stmt = db.prepare(query);
    const result = await (params.length ? stmt.bind(...params) : stmt).all();

    return c.json({ success: true, data: result.results });
});

// ── GET /api/teachers/:id ──
teachers.get("/:id", async (c) => {
    const id = c.req.param("id");
    const teacher = await c.env.DB.prepare("SELECT * FROM teachers WHERE id = ?").bind(id).first();
    if (!teacher) return c.json({ success: false, error: "Docente no encontrado" }, 404);

    // Get schedules for this teacher
    const schedules = await c.env.DB
        .prepare(`
      SELECT s.*, sub.name as subject_name, sub.short_code, g.name as group_name
      FROM schedules s
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN groups_table g ON s.group_id = g.id
      WHERE s.teacher_id = ?
      ORDER BY s.day, s.period_num
    `)
        .bind(id)
        .all();

    return c.json({ success: true, data: { ...teacher, schedules: schedules.results } });
});

// ── POST /api/teachers ──
teachers.post("/", zValidator("json", teacherSchema), async (c) => {
    const body = c.req.valid("json");
    const result = await c.env.DB
        .prepare("INSERT INTO teachers (name, short_name, specialty) VALUES (?, ?, ?)")
        .bind(body.name, body.short_name, body.specialty ?? null)
        .run();

    return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201);
});

// ── PUT /api/teachers/:id ──
teachers.put("/:id", zValidator("json", teacherSchema.partial()), async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, val] of Object.entries(body)) {
        if (val !== undefined) {
            fields.push(`${key} = ?`);
            values.push(val);
        }
    }

    if (fields.length === 0) return c.json({ success: false, error: "Sin campos" }, 400);

    values.push(id);
    await c.env.DB.prepare(`UPDATE teachers SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

    return c.json({ success: true });
});

// ── DELETE /api/teachers/:id ──
teachers.delete("/:id", async (c) => {
    await c.env.DB.prepare("DELETE FROM teachers WHERE id = ?").bind(c.req.param("id")).run();
    return c.json({ success: true });
});

export { teachers as teachersRoutes };
