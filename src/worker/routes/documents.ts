import { Hono } from "hono";
import type { Bindings } from "../bindings";
import { requireAuth } from "../middleware/auth";

const documents = new Hono<{ Bindings: Bindings }>();

// ── GET /api/documents/student/:id ──
// Lista los documentos de un alumno específico
documents.get("/student/:id", requireAuth, async (c) => {
    const studentId = c.req.param("id");
    const db = c.env.DB;

    try {
        const result = await db.prepare("SELECT * FROM student_documents WHERE student_id = ? ORDER BY uploaded_at DESC")
            .bind(studentId)
            .all();
            
        return c.json({ success: true, data: result.results });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

// ── GET /api/documents/download/:key ──
// Provee una URL prefirmada (o redirecciona) para ver el archivo desde R2
documents.get("/download/:key", requireAuth, async (c) => {
    const fileKey = c.req.param("key");
    const bucket = c.env.STORAGE;

    try {
        const object = await bucket.get(fileKey);

        if (object === null) {
            return new Response('File Note Found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        
        return new Response(object.body, { headers });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

// ── POST /api/documents/upload ──
// Sube un documento a R2 y registra en DB
documents.post("/upload", requireAuth, async (c) => {
    try {
        const body = await c.req.parseBody();
        const file = body["file"] as File;
        const studentId = body["student_id"] as string;
        const documentType = body["document_type"] as string;
        const db = c.env.DB;
        const bucket = c.env.STORAGE;
        const user = c.get("user"); // from requireAuth middleware

        if (!file || !studentId || !documentType) {
            return c.json({ success: false, error: "Missing required fields" }, 400);
        }

        // Generate a unique key for R2: studentId/documentType-timestamp-filename
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileKey = `students/${studentId}/${documentType}-${timestamp}.${fileExt}`;

        // Upload to R2
        await bucket.put(fileKey, file.stream(), {
            httpMetadata: { contentType: file.type }
        });

        // Save metadata to DB
        const result = await db.prepare(`
            INSERT INTO student_documents (student_id, document_type, file_key, file_name, content_type, uploaded_by) 
            VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(studentId, documentType, fileKey, file.name, file.type, user.id)
        .run();

        return c.json({ 
            success: true, 
            message: "Documento subido correctamente", 
            data: { id: result.meta.last_row_id, file_key: fileKey }
        });
    } catch (e: any) {
        console.error("Upload error:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

// ── GET /api/documents/requests ──
// Lista todas las solicitudes de trámites (Admin view)
documents.get("/requests/all", requireAuth, async (c) => {
    const db = c.env.DB;
    try {
        const result = await db.prepare(`
            SELECT dr.*, s.name as student_name, s.paterno, s.materno, s.no_control, s.grupo 
            FROM document_requests dr
            JOIN students s ON dr.student_id = s.id
            ORDER BY dr.requested_at DESC
        `).all();
        
        return c.json({ success: true, data: result.results });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

export { documents as documentsRoutes };
