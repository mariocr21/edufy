import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Bindings } from "../bindings";

const students = new Hono<{ Bindings: Bindings }>();

const studentSchema = z.object({
    no_control: z.string().min(1),
    curp: z.string().optional().default(""),
    name: z.string().min(1),
    paterno: z.string().min(1),
    materno: z.string().optional().default(""),
    career: z.string().optional().default(""),
    generation: z.string().optional().default(""),
    semester: z.number().int().min(0).max(12).optional().default(0),
    grupo: z.string().optional().default(""),
    blood_type: z.string().optional().nullable(),
    nss: z.string().optional().nullable(),
});

// ── GET /api/students ──
students.get("/", async (c) => {
    const db = c.env.DB;
    const grupo = c.req.query("grupo");
    const semester = c.req.query("semester");
    const search = c.req.query("search");
    const career = c.req.query("career");

    let query = "SELECT * FROM students WHERE active = 1";
    const params: (string | number)[] = [];

    if (grupo) { query += " AND grupo = ?"; params.push(grupo); }
    if (semester) { query += " AND semester = ?"; params.push(Number(semester)); }
    if (career) { query += " AND career = ?"; params.push(career); }
    if (search) {
        query += " AND (name LIKE ? OR paterno LIKE ? OR materno LIKE ? OR no_control LIKE ? OR curp LIKE ?)";
        const s = `%${search}%`;
        params.push(s, s, s, s, s);
    }

    query += " ORDER BY paterno, materno, name";

    const stmt = db.prepare(query);
    const result = await (params.length ? stmt.bind(...params) : stmt).all();

    return c.json({ success: true, data: result.results });
});

// ── GET /api/students/stats/summary ──
students.get("/stats/summary", async (c) => {
    const db = c.env.DB;
    const total = await db.prepare("SELECT COUNT(*) as count FROM students WHERE active = 1").first<{ count: number }>();
    const byGroup = await db.prepare("SELECT grupo, COUNT(*) as count FROM students WHERE active = 1 GROUP BY grupo ORDER BY grupo").all();
    const byCareer = await db.prepare("SELECT career, COUNT(*) as count FROM students WHERE active = 1 GROUP BY career ORDER BY career").all();

    return c.json({
        success: true,
        data: { total: total?.count ?? 0, by_group: byGroup.results, by_career: byCareer.results },
    });
});

// ── GET /api/students/:id ──
students.get("/:id", async (c) => {
    const id = c.req.param("id");
    const db = c.env.DB;

    const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(id).first();
    if (!student) return c.json({ success: false, error: "Alumno no encontrado" }, 404);

    const guardians = await db.prepare("SELECT * FROM guardians WHERE student_id = ?").bind(id).all();

    return c.json({ success: true, data: { ...student, guardians: guardians.results } });
});

// ── POST /api/students ──
students.post("/", zValidator("json", studentSchema), async (c) => {
    const body = c.req.valid("json");
    const db = c.env.DB;

    const existing = await db.prepare("SELECT id FROM students WHERE no_control = ?").bind(body.no_control).first();
    if (existing) return c.json({ success: false, error: "Ya existe un alumno con ese No. Control" }, 409);

    const result = await db
        .prepare("INSERT INTO students (no_control, curp, name, paterno, materno, career, generation, semester, grupo, blood_type, nss) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(body.no_control, body.curp, body.name, body.paterno, body.materno, body.career, body.generation, body.semester, body.grupo, body.blood_type ?? null, body.nss ?? null)
        .run();

    return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201);
});

// ── PUT /api/students/:id ──
students.put("/:id", zValidator("json", studentSchema.partial()), async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const db = c.env.DB;

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, val] of Object.entries(body)) {
        if (val !== undefined) {
            fields.push(`${key} = ?`);
            values.push(val);
        }
    }

    if (fields.length === 0) return c.json({ success: false, error: "Sin campos para actualizar" }, 400);

    values.push(id);
    await db.prepare(`UPDATE students SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

    return c.json({ success: true });
});

// ── DELETE /api/students/:id ── (soft delete)
students.delete("/:id", async (c) => {
    const id = c.req.param("id");
    await c.env.DB.prepare("UPDATE students SET active = 0 WHERE id = ?").bind(id).run();
    return c.json({ success: true });
});

export { students as studentsRoutes };
