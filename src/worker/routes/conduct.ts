import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../bindings";
import { requireAuth, requireRoles } from "../middleware/auth";

const conduct = new Hono<{ Bindings: Bindings }>();

const conductSchema = z.object({
    student_id: z.number(),
    report_type: z.enum(["amonestacion", "suspension", "nota"]),
    description: z.string().min(1, "La descripción es requerida"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)")
});

// ── GET /api/conduct/student/:studentId ──
// Get all conduct reports for a specific student
conduct.get("/student/:studentId", requireAuth, async (c) => {
    const studentId = c.req.param("studentId");
    const db = c.env.DB;

    const query = `
        SELECT cr.*, u.name as reported_by_name 
        FROM conduct_reports cr
        LEFT JOIN users u ON cr.reported_by = u.id
        WHERE cr.student_id = ?
        ORDER BY cr.date DESC, cr.created_at DESC
    `;
    
    const result = await db.prepare(query).bind(Number(studentId)).all();
    return c.json({ success: true, data: result.results });
});

// ── GET /api/conduct/recent ──
// Get recent conduct reports across the school (Admin / Prefect only)
conduct.get("/recent", requireAuth, requireRoles(["admin", "prefect"]), async (c) => {
    const limit = Number(c.req.query("limit")) || 50;
    const db = c.env.DB;

    const query = `
        SELECT cr.*, 
               st.name as student_name, st.paterno, st.materno, st.no_control, st.grupo,
               u.name as reported_by_name 
        FROM conduct_reports cr
        JOIN students st ON cr.student_id = st.id
        LEFT JOIN users u ON cr.reported_by = u.id
        ORDER BY cr.date DESC, cr.created_at DESC
        LIMIT ?
    `;
    
    const result = await db.prepare(query).bind(limit).all();
    return c.json({ success: true, data: result.results });
});

// ── POST /api/conduct ──
// Create a new conduct report
conduct.post("/", requireAuth, requireRoles(["admin", "prefect", "teacher"]), async (c) => {
    try {
        const body = await c.req.json();
        const data = conductSchema.parse(body);
        const user = c.get("user"); // Set by requireAuth
        const db = c.env.DB;

        const query = `
            INSERT INTO conduct_reports (student_id, reported_by, report_type, description, date)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = await db.prepare(query)
            .bind(data.student_id, user.id, data.report_type, data.description, data.date)
            .run();

        return c.json({ 
            success: true, 
            message: "Reporte disciplinario guardado",
            id: result.meta.last_row_id 
        }, 201);
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return c.json({ success: false, error: "Datos inválidos", details: e.errors }, 400);
        }
        return c.json({ success: false, error: e.message }, 500);
    }
});

// ── DELETE /api/conduct/:id ──
// Delete a conduct report (Admin / Prefect only)
conduct.delete("/:id", requireAuth, requireRoles(["admin", "prefect"]), async (c) => {
    const id = c.req.param("id");
    const db = c.env.DB;

    const result = await db.prepare("DELETE FROM conduct_reports WHERE id = ?").bind(Number(id)).run();

    if (result.meta.changes === 0) {
        return c.json({ success: false, error: "Reporte no encontrado" }, 404);
    }

    return c.json({ success: true, message: "Reporte eliminado" });
});

export { conduct as conductRoutes };
