import { createMiddleware } from "hono/factory";
import type { Bindings } from "../../worker/bindings";
import { verify } from "hono/jwt";
import type { UserRole } from "../../shared/types";

// Extiende el Contexto de Hono para incluir auth
type Variables = {
    user: {
        id: number;
        email: string;
        role: UserRole;
    };
};

/**
 * Middleware que verifica el JWT y asegura que el usuario esté autenticado.
 */
export const requireAuth = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.json({ success: false, error: "Token requerido" }, 401);
    }

    try {
        const token = authHeader.slice(7);
        const secret = c.env.JWT_SECRET || "cetmar42-dev-secret";
        
        // El payload que firmamos en auth.ts tiene sub, email y role
        const payload = await verify(token, secret);
        
        c.set("user", {
            id: payload.sub as number,
            email: payload.email as string,
            role: payload.role as UserRole,
        });

        await next();
    } catch {
        return c.json({ success: false, error: "Token inválido o expirado" }, 401);
    }
});

/**
 * Middleware de control de acceso basado en roles.
 * Asegúrate de usar `requireAuth` ANTES de usar este middleware.
 * @param allowedRoles Array de roles permitidos para esta ruta
 */
export const requireRoles = (allowedRoles: UserRole[]) => {
    return createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
        const user = c.get("user");
        if (!user) {
            return c.json({ success: false, error: "Usuario no autenticado" }, 401);
        }

        if (!allowedRoles.includes(user.role)) {
            return c.json({ success: false, error: "Acceso denegado: rol insuficiente" }, 403);
        }

        await next();
    });
};
