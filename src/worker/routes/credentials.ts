import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../bindings";
import { requireAuth, requireRoles } from "../middleware/auth";

const credentials = new Hono<{ Bindings: Bindings }>();

// ── GET /api/credentials ──
// Get credentials status for students (with optional group filter)
credentials.get("/", requireAuth, requireRoles(["admin", "prefect"]), async (c) => {
    const groupId = c.req.query("group_id");
    const db = c.env.DB;

    let query = `
        SELECT st.id as student_id, st.no_control, st.name, st.paterno, st.materno, st.grupo,
               c.qr_token, c.is_active, c.issued_at
        FROM students st
        LEFT JOIN credentials c ON st.id = c.student_id
    `;
    const params: (number | string)[] = [];

    if (groupId) {
        query += `
            JOIN group_students gs ON st.id = gs.student_id
            WHERE gs.group_id = ?
        `;
        params.push(Number(groupId));
    }

    query += " ORDER BY st.paterno, st.materno, st.name";

    const result = await db.prepare(query).bind(...params).all();
    return c.json({ success: true, data: result.results });
});

// ── POST /api/credentials/generate ──
// Generate or regenerate QR tokens for one or more students
credentials.post("/generate", requireAuth, requireRoles(["admin"]), async (c) => {
    try {
        const body = await c.req.json();
        const schema = z.object({
            student_ids: z.array(z.number()).min(1)
        });
        const data = schema.parse(body);
        const db = c.env.DB;

        let generatedCount = 0;

        for (const studentId of data.student_ids) {
            // Generate a random token (in production, use a more secure crypto random)
            const token = `QR-${studentId}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
            
            // Upsert credential
            await db.prepare(`
                INSERT INTO credentials (student_id, qr_token, is_active)
                VALUES (?, ?, 1)
                ON CONFLICT(student_id) DO UPDATE SET 
                    qr_token = excluded.qr_token, 
                    is_active = 1,
                    issued_at = CURRENT_TIMESTAMP
            `).bind(studentId, token).run();

            generatedCount++;
        }

        return c.json({ success: true, message: `Generadas ${generatedCount} credenciales` });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 400);
    }
});

// ── POST /api/credentials/scan ──
// Record entry/exit log from a QR scan
credentials.post("/scan", requireAuth, requireRoles(["admin", "prefect"]), async (c) => {
    try {
        const body = await c.req.json();
        const schema = z.object({
            qr_token: z.string(),
            scan_type: z.enum(["entry", "exit"])
        });
        const data = schema.parse(body);
        const user = c.get("user");
        const db = c.env.DB;

        // Verify token
        const cred = await db.prepare(`
            SELECT c.student_id, c.is_active, 
                   st.name, st.paterno, st.materno, st.no_control, st.grupo
            FROM credentials c
            JOIN students st ON c.student_id = st.id
            WHERE c.qr_token = ?
        `).bind(data.qr_token).first<{
            student_id: number; is_active: number; 
            name: string; paterno: string; materno: string; 
            no_control: string; grupo: string;
        }>();

        if (!cred) {
            return c.json({ success: false, error: "Código QR inválido" }, 404);
        }

        if (!cred.is_active) {
            return c.json({ success: false, error: "Credencial inactiva" }, 403);
        }

        // Record log
        await db.prepare(`
            INSERT INTO entry_logs (student_id, scanned_by, scan_type)
            VALUES (?, ?, ?)
        `).bind(cred.student_id, user.id, data.scan_type).run();

        return c.json({ 
            success: true, 
            message: data.scan_type === 'entry' ? 'Entrada registrada' : 'Salida registrada',
            student: {
                name: `${cred.paterno} ${cred.materno} ${cred.name}`,
                no_control: cred.no_control,
                grupo: cred.grupo
            }
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 400);
    }
});

// ── GET /api/credentials/logs ──
// Get today's entry/exit logs
credentials.get("/logs", requireAuth, requireRoles(["admin", "prefect"]), async (c) => {
    const db = c.env.DB;

    // Get logs for the last 24 hours
    const query = `
        SELECT el.*, 
               st.name as student_name, st.paterno, st.materno, st.no_control, st.grupo,
               u.name as scanned_by_name
        FROM entry_logs el
        JOIN students st ON el.student_id = st.id
        LEFT JOIN users u ON el.scanned_by = u.id
        WHERE date(el.timestamp) = date('now', 'localtime')
           OR el.timestamp > datetime('now', '-24 hours')
        ORDER BY el.timestamp DESC
        LIMIT 100
    `;
    
    const result = await db.prepare(query).all();
    return c.json({ success: true, data: result.results });
});

export { credentials as credentialsRoutes };
