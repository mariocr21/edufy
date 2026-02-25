import { Hono } from "hono";
import type { Bindings } from "../bindings";

const students = new Hono<{ Bindings: Bindings }>();

// ── GET /api/students ──
students.get("/", async (c) => {
    const db = c.env.DB;
    const grupo = c.req.query("grupo");
    const semester = c.req.query("semester");

    let query = "SELECT * FROM students WHERE active = 1";
    const params: (string | number)[] = [];

    if (grupo) {
        query += " AND grupo = ?";
        params.push(grupo);
    }
    if (semester) {
        query += " AND semester = ?";
        params.push(Number(semester));
    }

    query += " ORDER BY paterno, materno, name";

    const stmt = db.prepare(query);
    const result = await (params.length ? stmt.bind(...params) : stmt).all();

    return c.json({ success: true, data: result.results });
});

// ── GET /api/students/:id ──
students.get("/:id", async (c) => {
    const id = c.req.param("id");
    const db = c.env.DB;

    const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(id).first();
    if (!student) {
        return c.json({ success: false, error: "Alumno no encontrado" }, 404);
    }

    // Get guardians
    const guardians = await db.prepare("SELECT * FROM guardians WHERE student_id = ?").bind(id).all();

    return c.json({ success: true, data: { ...student, guardians: guardians.results } });
});

// ── GET /api/students/stats/summary ──
students.get("/stats/summary", async (c) => {
    const db = c.env.DB;

    const total = await db.prepare("SELECT COUNT(*) as count FROM students WHERE active = 1").first<{ count: number }>();
    const byGroup = await db
        .prepare("SELECT grupo, COUNT(*) as count FROM students WHERE active = 1 GROUP BY grupo ORDER BY grupo")
        .all();
    const byCareer = await db
        .prepare("SELECT career, COUNT(*) as count FROM students WHERE active = 1 GROUP BY career ORDER BY career")
        .all();

    return c.json({
        success: true,
        data: {
            total: total?.count ?? 0,
            by_group: byGroup.results,
            by_career: byCareer.results,
        },
    });
});

export { students as studentsRoutes };
