import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { compare, hash } from "bcryptjs";
import { sign, verify } from "hono/jwt";
import type { Bindings } from "../bindings";
import type { UserRole } from "../../shared/types";

const auth = new Hono<{ Bindings: Bindings }>();

// ── Zod Schemas ──
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(4),
});

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(["admin", "teacher", "prefect", "student", "parent"]),
    display_name: z.string().min(2),
});

// ── POST /api/auth/login ──
auth.post("/login", zValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    const db = c.env.DB;

    const user = await db
        .prepare("SELECT id, email, password_hash, role, display_name, active FROM users WHERE email = ?")
        .bind(email)
        .first<{ id: number; email: string; password_hash: string; role: UserRole; display_name: string; active: number }>();

    if (!user) {
        return c.json({ success: false, error: "Credenciales inválidas" }, 401);
    }

    if (!user.active) {
        return c.json({ success: false, error: "Cuenta desactivada" }, 403);
    }

    const valid = await compare(password, user.password_hash);
    if (!valid) {
        return c.json({ success: false, error: "Credenciales inválidas" }, 401);
    }

    const secret = c.env.JWT_SECRET || "cetmar42-dev-secret";
    const token = await sign(
        {
            sub: user.id,
            email: user.email,
            role: user.role,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
        },
        secret
    );

    return c.json({
        success: true,
        data: {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                display_name: user.display_name,
                active: !!user.active,
            },
        },
    });
});

// ── POST /api/auth/register (admin only) ──
auth.post("/register", zValidator("json", registerSchema), async (c) => {
    const body = c.req.valid("json");
    const db = c.env.DB;

    // Check if email exists
    const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(body.email).first();
    if (existing) {
        return c.json({ success: false, error: "El correo ya está registrado" }, 409);
    }

    const passwordHash = await hash(body.password, 10);

    const result = await db
        .prepare("INSERT INTO users (email, password_hash, role, display_name) VALUES (?, ?, ?, ?)")
        .bind(body.email, passwordHash, body.role, body.display_name)
        .run();

    return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201);
});

// ── GET /api/auth/me ──
auth.get("/me", async (c) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ success: false, error: "Token requerido" }, 401);
    }

    try {
        const token = authHeader.slice(7);
        const secret = c.env.JWT_SECRET || "cetmar42-dev-secret";
        const payload = await verify(token, secret);

        const user = await c.env.DB
            .prepare("SELECT id, email, role, display_name, active FROM users WHERE id = ?")
            .bind(payload.sub)
            .first();

        if (!user) {
            return c.json({ success: false, error: "Usuario no encontrado" }, 404);
        }

        return c.json({ success: true, data: user });
    } catch {
        return c.json({ success: false, error: "Token inválido" }, 401);
    }
});

export { auth as authRoutes };
