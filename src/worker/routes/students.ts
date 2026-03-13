import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Bindings } from "../bindings";
import { requireAuth } from "../middleware/auth";

const students = new Hono<{ Bindings: Bindings }>();

const studentSchema = z.object({
    no_control: z.string().min(1),
    curp: z.string().optional().default(""),
    name: z.string().min(1),
    paterno: z.string().min(1),
    materno: z.string().optional().default(""),
    career: z.string().optional().default(""),
    generation: z.string().optional().default(""),
    semester: z.number().int().min(0).max(12).optional().default(0),
    grupo: z.string().optional().default(""),
    blood_type: z.string().optional().nullable(),
    nss: z.string().optional().nullable(),
});

const guardianSchema = z.object({
    name: z.string().trim().min(1),
    relationship: z.string().trim().min(1),
    phone: z.string().trim().min(1),
    phone_alt: z.string().trim().optional(),
    email: z.string().trim().email().optional().or(z.literal("")),
});

const guardianUpdateSchema = guardianSchema.partial();

const requiredDocumentTypes = [
    "photo",
    "acta_nacimiento",
    "curp",
    "certificado_secundaria",
    "comprobante_domicilio",
] as const;

type StudentDocumentRow = {
    id: number;
    student_id: number;
    document_type: string;
    file_key: string;
    file_name: string;
    content_type: string;
    uploaded_by: number | null;
    uploaded_at: string;
};

function buildDownloadUrl(fileKey: string) {
    return `/api/documents/download?key=${encodeURIComponent(fileKey)}`;
}

type ConductSchemaInfo = {
    hasReportType: boolean;
    hasLegacyType: boolean;
    hasCreatedAt: boolean;
};

async function getConductSchemaInfo(db: D1Database): Promise<ConductSchemaInfo> {
    const result = await db.prepare("PRAGMA table_info(conduct_reports)").all<{
        name: string;
    }>();

    const columnNames = new Set((result.results ?? []).map((column) => column.name));

    return {
        hasReportType: columnNames.has("report_type"),
        hasLegacyType: columnNames.has("type"),
        hasCreatedAt: columnNames.has("created_at"),
    };
}

// ── GET /api/students ──
students.get("/", requireAuth, async (c) => {
    const db = c.env.DB;
    const grupo = c.req.query("grupo");
    const semester = c.req.query("semester");
    const search = c.req.query("search") ?? c.req.query("q");
    const career = c.req.query("career");
    const limit = Number(c.req.query("limit"));

    let query = `
        SELECT s.*, 
               (SELECT phone FROM guardians WHERE student_id = s.id LIMIT 1) as primary_phone,
               (SELECT name FROM guardians WHERE student_id = s.id LIMIT 1) as guardian_name
        FROM students s WHERE s.active = 1
    `;
    const params: (string | number)[] = [];

    if (grupo) { query += " AND s.grupo = ?"; params.push(grupo); }
    if (semester) { query += " AND s.semester = ?"; params.push(Number(semester)); }
    if (career) { query += " AND s.career = ?"; params.push(career); }
    if (search) {
        query += " AND (s.name LIKE ? OR s.paterno LIKE ? OR s.materno LIKE ? OR s.no_control LIKE ? OR s.curp LIKE ?)";
        const s = `%${search}%`;
        params.push(s, s, s, s, s);
    }

    query += " ORDER BY s.paterno, s.materno, s.name";
    if (Number.isFinite(limit) && limit > 0) {
        query += " LIMIT ?";
        params.push(Math.min(limit, 100));
    }

    const stmt = db.prepare(query);
    const result = await (params.length ? stmt.bind(...params) : stmt).all();

    return c.json({ success: true, data: result.results });
});

// ── GET /api/students/stats/summary ──
students.get("/stats/summary", requireAuth, async (c) => {
    const db = c.env.DB;
    const total = await db.prepare("SELECT COUNT(*) as count FROM students WHERE active = 1").first<{ count: number }>();
    const byGroup = await db.prepare("SELECT grupo, COUNT(*) as count FROM students WHERE active = 1 GROUP BY grupo ORDER BY grupo").all();
    const byCareer = await db.prepare("SELECT career, COUNT(*) as count FROM students WHERE active = 1 GROUP BY career ORDER BY career").all();

    return c.json({
        success: true,
        data: { total: total?.count ?? 0, by_group: byGroup.results, by_career: byCareer.results },
    });
});

// ── GET /api/students/:id ──
students.get("/:id/profile", requireAuth, async (c) => {
    const id = c.req.param("id");
    const db = c.env.DB;

    try {
        const student = await db.prepare("SELECT * FROM students WHERE id = ? AND active = 1").bind(id).first();
        if (!student) return c.json({ success: false, error: "Alumno no encontrado" }, 404);

        const guardiansResult = await db
            .prepare("SELECT * FROM guardians WHERE student_id = ? ORDER BY id ASC")
            .bind(id)
            .all();

        const documentsResult = await db
            .prepare("SELECT * FROM student_documents WHERE student_id = ? ORDER BY uploaded_at DESC")
            .bind(id)
            .all();

        const conductSchema = await getConductSchemaInfo(db);
        const incidentTypeSelect = conductSchema.hasReportType
            ? "cr.report_type"
            : conductSchema.hasLegacyType
                ? `CASE
                    WHEN cr.type = 'warning' THEN 'amonestacion'
                    WHEN cr.type = 'note' THEN 'nota'
                    ELSE cr.type
                  END`
                : "'nota'";
        const incidentOrderBy = conductSchema.hasCreatedAt
            ? "cr.date DESC, cr.created_at DESC"
            : "cr.date DESC, cr.id DESC";

        const incidentsResult = await db.prepare(`
            SELECT
                cr.id,
                cr.student_id,
                ${incidentTypeSelect} as report_type,
                cr.description,
                cr.date,
                ${conductSchema.hasCreatedAt ? "cr.created_at" : "NULL"} as created_at,
                u.name as reported_by_name
            FROM conduct_reports cr
            LEFT JOIN users u ON cr.reported_by = u.id
            WHERE cr.student_id = ?
            ORDER BY ${incidentOrderBy}
            LIMIT 5
        `)
            .bind(id)
            .all();

        const documents = documentsResult.results as StudentDocumentRow[];
        const uploadedDocumentTypes = new Set(
            documents
                .map((document) => document.document_type)
                .filter((documentType): documentType is string => Boolean(documentType)),
        );

        const documentChecklist = requiredDocumentTypes.map((documentType) => ({
            document_type: documentType,
            status: uploadedDocumentTypes.has(documentType) ? "uploaded" : "missing",
        }));

        return c.json({
            success: true,
            data: {
                student,
                guardians: guardiansResult.results,
                documents: documents.map((document) => ({
                    ...document,
                    download_url: buildDownloadUrl(document.file_key),
                    is_primary: document.document_type === "photo" && student.photo_url === buildDownloadUrl(document.file_key),
                })),
                recent_incidents: incidentsResult.results,
                document_checklist: documentChecklist,
            },
        });
    } catch (error: any) {
        console.error("Student profile error:", error);
        return c.json({ success: false, error: error?.message ?? "No se pudo cargar el perfil del alumno" }, 500);
    }
});

students.post("/:id/guardians", requireAuth, zValidator("json", guardianSchema), async (c) => {
    const studentId = c.req.param("id");
    const body = c.req.valid("json");
    const db = c.env.DB;

    const student = await db.prepare("SELECT id FROM students WHERE id = ? AND active = 1").bind(studentId).first();
    if (!student) return c.json({ success: false, error: "Alumno no encontrado" }, 404);

    const result = await db.prepare(`
        INSERT INTO guardians (student_id, name, relationship, phone, phone_alt, email)
        VALUES (?, ?, ?, ?, ?, ?)
    `)
        .bind(
            studentId,
            body.name,
            body.relationship,
            body.phone,
            body.phone_alt || null,
            body.email || null,
        )
        .run();

    return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201);
});

students.put("/:id/guardians/:guardianId", requireAuth, zValidator("json", guardianUpdateSchema), async (c) => {
    const studentId = c.req.param("id");
    const guardianId = c.req.param("guardianId");
    const body = c.req.valid("json");
    const db = c.env.DB;

    const guardian = await db
        .prepare("SELECT id FROM guardians WHERE id = ? AND student_id = ?")
        .bind(guardianId, studentId)
        .first();

    if (!guardian) return c.json({ success: false, error: "Tutor no encontrado" }, 404);

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(body)) {
        if (value !== undefined) {
            fields.push(`${key} = ?`);
            values.push(value === "" ? null : value);
        }
    }

    if (fields.length === 0) return c.json({ success: false, error: "Sin campos para actualizar" }, 400);

    values.push(guardianId, studentId);
    await db
        .prepare(`UPDATE guardians SET ${fields.join(", ")} WHERE id = ? AND student_id = ?`)
        .bind(...values)
        .run();

    return c.json({ success: true });
});

students.delete("/:id/guardians/:guardianId", requireAuth, async (c) => {
    const studentId = c.req.param("id");
    const guardianId = c.req.param("guardianId");
    const db = c.env.DB;

    const result = await db
        .prepare("DELETE FROM guardians WHERE id = ? AND student_id = ?")
        .bind(guardianId, studentId)
        .run();

    if (result.meta.changes === 0) {
        return c.json({ success: false, error: "Tutor no encontrado" }, 404);
    }

    return c.json({ success: true });
});

students.get("/:id", requireAuth, async (c) => {
    const id = c.req.param("id");
    const db = c.env.DB;

    const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(id).first();
    if (!student) return c.json({ success: false, error: "Alumno no encontrado" }, 404);

    const guardians = await db.prepare("SELECT * FROM guardians WHERE student_id = ?").bind(id).all();

    return c.json({ success: true, data: { ...student, guardians: guardians.results } });
});

// ── POST /api/students ──
students.post("/", requireAuth, zValidator("json", studentSchema), async (c) => {
    const body = c.req.valid("json");
    const db = c.env.DB;

    const existing = await db.prepare("SELECT id FROM students WHERE no_control = ?").bind(body.no_control).first();
    if (existing) return c.json({ success: false, error: "Ya existe un alumno con ese No. Control" }, 409);

    const result = await db
        .prepare("INSERT INTO students (no_control, curp, name, paterno, materno, career, generation, semester, grupo, blood_type, nss) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
        .bind(body.no_control, body.curp, body.name, body.paterno, body.materno, body.career, body.generation, body.semester, body.grupo, body.blood_type ?? null, body.nss ?? null)
        .run();

    return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201);
});

// ── PUT /api/students/:id ──
students.put("/:id", requireAuth, zValidator("json", studentSchema.partial()), async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const db = c.env.DB;

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, val] of Object.entries(body)) {
        if (val !== undefined) {
            fields.push(`${key} = ?`);
            values.push(val);
        }
    }

    if (fields.length === 0) return c.json({ success: false, error: "Sin campos para actualizar" }, 400);

    values.push(id);
    await db.prepare(`UPDATE students SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

    return c.json({ success: true });
});

// ── DELETE /api/students/:id ── (soft delete)
students.delete("/:id", requireAuth, async (c) => {
    const id = c.req.param("id");
    await c.env.DB.prepare("UPDATE students SET active = 0 WHERE id = ?").bind(id).run();
    return c.json({ success: true });
});

export { students as studentsRoutes };
