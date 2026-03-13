import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { hash } from "bcryptjs";
import type { Bindings } from "../bindings";
import { requireAuth, requireRoles } from "../middleware/auth";

const users = new Hono<{ Bindings: Bindings }>();

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["admin", "teacher", "prefect", "student", "parent"]),
    display_name: z.string().min(2),
});

const updateStatusSchema = z.object({
    active: z.boolean(),
});

const resetPasswordSchema = z.object({
    password: z.string().min(6),
});

users.get("/", requireAuth, requireRoles(["admin"]), async (c) => {
    const search = c.req.query("search");
    const role = c.req.query("role");
    const db = c.env.DB;

    let query = `
        SELECT u.id, u.email, u.role, u.display_name, u.active, u.created_at,
               t.id as teacher_id, t.name as teacher_name,
               s.id as student_id, s.no_control
        FROM users u
        LEFT JOIN teachers t ON t.user_id = u.id
        LEFT JOIN students s ON s.user_id = u.id
        WHERE 1 = 1
    `;
    const params: string[] = [];

    if (role) {
        query += " AND u.role = ?";
        params.push(role);
    }

    if (search) {
        query += " AND (u.email LIKE ? OR u.display_name LIKE ?)";
        const term = `%${search}%`;
        params.push(term, term);
    }

    query += " ORDER BY u.display_name, u.email";

    const stmt = db.prepare(query);
    const result = await (params.length ? stmt.bind(...params) : stmt).all();

    return c.json({ success: true, data: result.results });
});

users.post("/", requireAuth, requireRoles(["admin"]), zValidator("json", createUserSchema), async (c) => {
    const body = c.req.valid("json");
    const db = c.env.DB;

    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(body.email).first();
    if (existing) {
        return c.json({ success: false, error: "El correo ya está registrado" }, 409);
    }

    const passwordHash = await hash(body.password, 10);
    const result = await db
        .prepare("INSERT INTO users (email, password_hash, role, display_name, active) VALUES (?, ?, ?, ?, 1)")
        .bind(body.email, passwordHash, body.role, body.display_name)
        .run();

    return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201);
});

users.put("/:id/status", requireAuth, requireRoles(["admin"]), zValidator("json", updateStatusSchema), async (c) => {
    const id = Number(c.req.param("id"));
    const { active } = c.req.valid("json");
    const db = c.env.DB;

    const result = await db.prepare("UPDATE users SET active = ? WHERE id = ?").bind(active ? 1 : 0, id).run();
    if (result.meta.changes === 0) {
        return c.json({ success: false, error: "Usuario no encontrado" }, 404);
    }

    return c.json({ success: true });
});

users.put("/:id/password", requireAuth, requireRoles(["admin"]), zValidator("json", resetPasswordSchema), async (c) => {
    const id = Number(c.req.param("id"));
    const { password } = c.req.valid("json");
    const db = c.env.DB;
    const passwordHash = await hash(password, 10);

    const result = await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(passwordHash, id).run();
    if (result.meta.changes === 0) {
        return c.json({ success: false, error: "Usuario no encontrado" }, 404);
    }

    return c.json({ success: true });
});

export { users as usersRoutes };
