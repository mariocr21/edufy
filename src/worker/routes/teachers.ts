import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Bindings } from "../bindings";
import { requireAuth, requireRoles } from "../middleware/auth";

const teachers = new Hono<{ Bindings: Bindings }>();

const teacherSchema = z.object({
    name: z.string().min(1),
    short_name: z.string().min(1),
    specialty: z.string().optional().nullable(),
    user_id: z.number().int().positive().optional().nullable(),
});

async function validateTeacherUserLink(db: D1Database, teacherId: number | null, userId: number | null) {
    if (userId == null) return null;

    const user = await db
        .prepare("SELECT id, role, active FROM users WHERE id = ?")
        .bind(userId)
        .first<{ id: number; role: string; active: number }>();

    if (!user) {
        return { status: 404 as const, error: "Usuario no encontrado" };
    }

    if (user.role !== "teacher") {
        return { status: 400 as const, error: "Solo se pueden vincular usuarios con rol docente" };
    }

    if (!user.active) {
        return { status: 400 as const, error: "No se puede vincular un usuario docente inactivo" };
    }

    const existingLink = await db
        .prepare("SELECT id, name FROM teachers WHERE user_id = ? AND (? IS NULL OR id != ?)")
        .bind(userId, teacherId, teacherId)
        .first<{ id: number; name: string }>();

    if (existingLink) {
        return { status: 409 as const, error: `El usuario ya está vinculado al docente ${existingLink.name}` };
    }

    return null;
}

teachers.get("/", requireAuth, async (c) => {
    const db = c.env.DB;
    const search = c.req.query("search");

    let query = `
        SELECT t.*,
               u.email as linked_user_email,
               u.display_name as linked_user_name,
               u.active as linked_user_active
        FROM teachers t
        LEFT JOIN users u ON t.user_id = u.id
    `;
    const params: string[] = [];

    if (search) {
        query += " WHERE t.name LIKE ? OR t.short_name LIKE ?";
        const s = `%${search}%`;
        params.push(s, s);
    }

    query += " ORDER BY t.name";

    const stmt = db.prepare(query);
    const result = await (params.length ? stmt.bind(...params) : stmt).all();

    return c.json({ success: true, data: result.results });
});

teachers.get("/:id", requireAuth, async (c) => {
    const id = c.req.param("id");
    const teacher = await c.env.DB
        .prepare(`
            SELECT t.*,
                   u.email as linked_user_email,
                   u.display_name as linked_user_name,
                   u.active as linked_user_active
            FROM teachers t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE t.id = ?
        `)
        .bind(id)
        .first();
    if (!teacher) return c.json({ success: false, error: "Docente no encontrado" }, 404);

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

teachers.post("/", requireAuth, requireRoles(["admin"]), zValidator("json", teacherSchema), async (c) => {
    const body = c.req.valid("json");
    const db = c.env.DB;

    const linkError = await validateTeacherUserLink(db, null, body.user_id ?? null);
    if (linkError) {
        return c.json({ success: false, error: linkError.error }, linkError.status);
    }

    const result = await db
        .prepare("INSERT INTO teachers (name, short_name, specialty, user_id) VALUES (?, ?, ?, ?)")
        .bind(body.name, body.short_name, body.specialty ?? null, body.user_id ?? null)
        .run();

    return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201);
});

teachers.put("/:id", requireAuth, requireRoles(["admin"]), zValidator("json", teacherSchema.partial()), async (c) => {
    const id = c.req.param("id");
    const teacherId = Number(id);
    const body = c.req.valid("json");
    const db = c.env.DB;

    if (body.user_id !== undefined) {
        const linkError = await validateTeacherUserLink(db, teacherId, body.user_id ?? null);
        if (linkError) {
            return c.json({ success: false, error: linkError.error }, linkError.status);
        }
    }

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
    await db.prepare(`UPDATE teachers SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

    return c.json({ success: true });
});

teachers.delete("/:id", requireAuth, requireRoles(["admin"]), async (c) => {
    await c.env.DB.prepare("DELETE FROM teachers WHERE id = ?").bind(c.req.param("id")).run();
    return c.json({ success: true });
});

export { teachers as teachersRoutes };
