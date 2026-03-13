import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../bindings";
import { requireAuth } from "../middleware/auth";

const documents = new Hono<{ Bindings: Bindings }>();

const documentTypes = [
    "photo",
    "acta_nacimiento",
    "curp",
    "certificado_secundaria",
    "comprobante_domicilio",
    "other",
] as const;

const documentTypeSchema = z.enum(documentTypes);

type StudentDocumentRow = {
    id: number;
    student_id: number;
    document_type: (typeof documentTypes)[number];
    file_key: string;
    file_name: string;
    content_type: string;
    uploaded_by: number | null;
    uploaded_at: string;
};

function buildDownloadUrl(fileKey: string) {
    return `/api/documents/download?key=${encodeURIComponent(fileKey)}`;
}

function serializeDocument(document: StudentDocumentRow, primaryPhotoUrl: string | null) {
    const downloadUrl = buildDownloadUrl(document.file_key);

    return {
        ...document,
        download_url: downloadUrl,
        is_primary: document.document_type === "photo" && primaryPhotoUrl === downloadUrl,
    };
}

documents.get("/student/:id", requireAuth, async (c) => {
    const studentId = c.req.param("id");
    const db = c.env.DB;

    try {
        const student = await db
            .prepare("SELECT photo_url FROM students WHERE id = ?")
            .bind(studentId)
            .first<{ photo_url: string | null }>();

        const result = await db
            .prepare("SELECT * FROM student_documents WHERE student_id = ? ORDER BY uploaded_at DESC")
            .bind(studentId)
            .all();

        return c.json({
            success: true,
            data: (result.results as StudentDocumentRow[]).map((document) =>
                serializeDocument(document, student?.photo_url ?? null),
            ),
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

documents.get("/download", requireAuth, async (c) => {
    const fileKey = c.req.query("key");
    const bucket = c.env.STORAGE;

    try {
        if (!fileKey) {
            return c.json({ success: false, error: "Archivo no especificado" }, 400);
        }

        const object = await bucket.get(fileKey);

        if (object === null) {
            return new Response("Archivo no encontrado", { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);

        return new Response(object.body, { headers });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

documents.post("/upload", requireAuth, async (c) => {
    try {
        const body = await c.req.parseBody();
        const file = body.file as File;
        const studentId = body.student_id as string;
        const documentType = documentTypeSchema.parse(body.document_type);
        const db = c.env.DB;
        const bucket = c.env.STORAGE;
        const user = c.get("user");

        if (!file || !studentId) {
            return c.json({ success: false, error: "Faltan campos requeridos" }, 400);
        }

        const student = await db
            .prepare("SELECT id, photo_url FROM students WHERE id = ? AND active = 1")
            .bind(studentId)
            .first<{ id: number; photo_url: string | null }>();

        if (!student) {
            return c.json({ success: false, error: "Alumno no encontrado" }, 404);
        }

        const timestamp = Date.now();
        const fileExt = file.name.includes(".") ? file.name.split(".").pop() : "bin";
        const fileKey = `students/${studentId}/${documentType}-${timestamp}.${fileExt}`;

        await bucket.put(fileKey, file.stream(), {
            httpMetadata: { contentType: file.type },
        });

        const result = await db
            .prepare(`
                INSERT INTO student_documents (student_id, document_type, file_key, file_name, content_type, uploaded_by)
                VALUES (?, ?, ?, ?, ?, ?)
            `)
            .bind(studentId, documentType, fileKey, file.name, file.type, user.id)
            .run();

        const downloadUrl = buildDownloadUrl(fileKey);
        if (documentType === "photo") {
            await db.prepare("UPDATE students SET photo_url = ? WHERE id = ?").bind(downloadUrl, studentId).run();
        }

        const createdDocument = await db
            .prepare("SELECT * FROM student_documents WHERE id = ?")
            .bind(result.meta.last_row_id)
            .first<StudentDocumentRow>();

        return c.json({
            success: true,
            message: "Documento subido correctamente",
            data: createdDocument
                ? serializeDocument(createdDocument, documentType === "photo" ? downloadUrl : student.photo_url)
                : {
                    id: result.meta.last_row_id,
                    file_key: fileKey,
                    download_url: downloadUrl,
                    is_primary: documentType === "photo",
                },
        });
    } catch (e: any) {
        console.error("Upload error:", e);
        if (e instanceof z.ZodError) {
            return c.json({ success: false, error: "Tipo de documento no permitido" }, 400);
        }
        return c.json({ success: false, error: e.message }, 500);
    }
});

documents.delete("/:id", requireAuth, async (c) => {
    const id = c.req.param("id");
    const db = c.env.DB;
    const bucket = c.env.STORAGE;

    try {
        const document = await db
            .prepare("SELECT * FROM student_documents WHERE id = ?")
            .bind(id)
            .first<StudentDocumentRow>();

        if (!document) {
            return c.json({ success: false, error: "Documento no encontrado" }, 404);
        }

        const student = await db
            .prepare("SELECT photo_url FROM students WHERE id = ?")
            .bind(document.student_id)
            .first<{ photo_url: string | null }>();

        await bucket.delete(document.file_key);
        await db.prepare("DELETE FROM student_documents WHERE id = ?").bind(id).run();

        const currentDocumentUrl = buildDownloadUrl(document.file_key);
        if (document.document_type === "photo" && student?.photo_url === currentDocumentUrl) {
            const nextPhoto = await db
                .prepare("SELECT file_key FROM student_documents WHERE student_id = ? AND document_type = 'photo' ORDER BY uploaded_at DESC LIMIT 1")
                .bind(document.student_id)
                .first<{ file_key: string }>();

            await db
                .prepare("UPDATE students SET photo_url = ? WHERE id = ?")
                .bind(nextPhoto ? buildDownloadUrl(nextPhoto.file_key) : null, document.student_id)
                .run();
        }

        return c.json({ success: true, message: "Documento eliminado" });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

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
