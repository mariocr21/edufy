import { Hono } from "hono";
import type { Bindings } from "../bindings";
import { requireAuth } from "../middleware/auth";

const grades = new Hono<{ Bindings: Bindings }>();

// ── GET /api/grades ──
// Returns grades for a specific student, optionally filtered by period
grades.get("/", requireAuth, async (c) => {
    const studentId = c.req.query("student_id");
    const periodId = c.req.query("period_id");
    
    if (!studentId) {
        return c.json({ success: false, error: "student_id es requerido" }, 400);
    }

    let query = `
        SELECT g.*, sub.name as subject_name, sub.short_code as subject_code, p.name as period_name
        FROM grades g
        LEFT JOIN subjects sub ON g.subject_id = sub.id
        JOIN periods p ON g.period_id = p.id
        WHERE g.student_id = ?
    `;
    const params: (string | number)[] = [Number(studentId)];

    if (periodId) {
        query += " AND g.period_id = ?";
        params.push(Number(periodId));
    }

    query += " ORDER BY p.year DESC, p.id DESC, sub.name ASC";

    const db = c.env.DB;
    const result = await db.prepare(query).bind(...params).all();

    return c.json({ success: true, data: result.results });
});

// ── GET /api/grades/group/:groupId ──
// Returns all grades for students in a specific group, optionally filtered by period
grades.get("/group/:groupId", requireAuth, async (c) => {
    const groupId = c.req.param("groupId");
    const periodId = c.req.query("period_id");

    let query = `
        SELECT g.*, st.no_control, st.name as student_name, st.paterno, st.materno,
               sub.name as subject_name, sub.short_code as subject_code
        FROM grades g
        JOIN students st ON g.student_id = st.id
        JOIN group_students gs ON st.id = gs.student_id
        LEFT JOIN subjects sub ON g.subject_id = sub.id
        WHERE gs.group_id = ?
    `;
    const params: (string | number)[] = [Number(groupId)];

    if (periodId) {
        query += " AND g.period_id = ?";
        params.push(Number(periodId));
    }

    query += " ORDER BY st.paterno, st.materno, st.name, sub.name";

    const db = c.env.DB;
    const result = await db.prepare(query).bind(...params).all();

    return c.json({ success: true, data: result.results });
});

// ── GET /api/grades/stats ──
// Returns general grade statistics, optionally filtered by period
grades.get("/stats", requireAuth, async (c) => {
    const periodId = c.req.query("period_id");
    const db = c.env.DB;

    let periodFilter = "";
    const params: (string | number)[] = [];
    if (periodId) {
        periodFilter = "WHERE period_id = ?";
        params.push(Number(periodId));
    }

    // Get average score, passing count, and failing count
    const statsQuery = `
        SELECT 
            AVG(final_score) as average_score,
            SUM(CASE WHEN final_score >= 6 THEN 1 ELSE 0 END) as passing_count,
            SUM(CASE WHEN final_score < 6 THEN 1 ELSE 0 END) as failing_count,
            COUNT(*) as total_grades
        FROM grades
        ${periodFilter}
    `;

    const stats = await db.prepare(statsQuery).bind(...params).first();

    return c.json({ success: true, data: stats });
});

export { grades as gradesRoutes };
