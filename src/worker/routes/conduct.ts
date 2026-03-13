import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../bindings";
import { requireAuth, requireRoles } from "../middleware/auth";

const conduct = new Hono<{ Bindings: Bindings }>();

const conductSchema = z.object({
    student_id: z.number(),
    report_type: z.enum(["amonestacion", "suspension", "nota"]),
    description: z.string().min(1, "La descripcion es requerida"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha invalido (YYYY-MM-DD)"),
});

type ConductSchemaInfo = {
    hasReportType: boolean;
    hasLegacyType: boolean;
    hasCreatedAt: boolean;
};

async function getConductSchemaInfo(db: D1Database): Promise<ConductSchemaInfo> {
    const result = await db.prepare("PRAGMA table_info(conduct_reports)").all<{ name: string }>();
    const columnNames = new Set((result.results ?? []).map((column) => column.name));

    return {
        hasReportType: columnNames.has("report_type"),
        hasLegacyType: columnNames.has("type"),
        hasCreatedAt: columnNames.has("created_at"),
    };
}

function getIncidentTypeSelect(schema: ConductSchemaInfo) {
    if (schema.hasReportType) return "cr.report_type";
    if (schema.hasLegacyType) {
        return `CASE
            WHEN cr.type = 'warning' THEN 'amonestacion'
            WHEN cr.type = 'note' THEN 'nota'
            ELSE cr.type
        END`;
    }
    return "'nota'";
}

function getIncidentOrderBy(schema: ConductSchemaInfo) {
    return schema.hasCreatedAt ? "cr.date DESC, cr.created_at DESC" : "cr.date DESC, cr.id DESC";
}

function mapReportTypeToLegacy(type: "amonestacion" | "suspension" | "nota") {
    switch (type) {
        case "amonestacion":
            return "warning";
        case "nota":
            return "note";
        default:
            return "suspension";
    }
}

conduct.get("/student/:studentId", requireAuth, async (c) => {
    const studentId = c.req.param("studentId");
    const db = c.env.DB;
    const schema = await getConductSchemaInfo(db);

    const query = `
        SELECT
            cr.id,
            cr.student_id,
            ${getIncidentTypeSelect(schema)} as report_type,
            cr.description,
            cr.date,
            ${schema.hasCreatedAt ? "cr.created_at" : "NULL"} as created_at,
            u.display_name as reported_by_name
        FROM conduct_reports cr
        LEFT JOIN users u ON cr.reported_by = u.id
        WHERE cr.student_id = ?
        ORDER BY ${getIncidentOrderBy(schema)}
    `;

    const result = await db.prepare(query).bind(Number(studentId)).all();
    return c.json({ success: true, data: result.results });
});

conduct.get("/recent", requireAuth, requireRoles(["admin", "prefect"]), async (c) => {
    const limit = Number(c.req.query("limit")) || 50;
    const db = c.env.DB;
    const schema = await getConductSchemaInfo(db);

    const query = `
        SELECT
               cr.id,
               cr.student_id,
               ${getIncidentTypeSelect(schema)} as report_type,
               cr.description,
               cr.date,
               ${schema.hasCreatedAt ? "cr.created_at" : "NULL"} as created_at,
               st.name as student_name, st.paterno, st.materno, st.no_control, st.grupo,
               u.display_name as reported_by_name
        FROM conduct_reports cr
        JOIN students st ON cr.student_id = st.id
        LEFT JOIN users u ON cr.reported_by = u.id
        ORDER BY ${getIncidentOrderBy(schema)}
        LIMIT ?
    `;

    const result = await db.prepare(query).bind(limit).all();
    return c.json({ success: true, data: result.results });
});

conduct.post("/", requireAuth, requireRoles(["admin", "prefect", "teacher"]), async (c) => {
    try {
        const body = await c.req.json();
        const data = conductSchema.parse(body);
        const user = c.get("user");
        const db = c.env.DB;
        const schema = await getConductSchemaInfo(db);

        const query = schema.hasReportType
            ? `
                INSERT INTO conduct_reports (student_id, reported_by, report_type, description, date)
                VALUES (?, ?, ?, ?, ?)
            `
            : `
                INSERT INTO conduct_reports (student_id, reported_by, type, description, date)
                VALUES (?, ?, ?, ?, ?)
            `;

        const result = await db.prepare(query)
            .bind(
                data.student_id,
                user.id,
                schema.hasReportType ? data.report_type : mapReportTypeToLegacy(data.report_type),
                data.description,
                data.date,
            )
            .run();

        return c.json({
            success: true,
            message: "Reporte disciplinario guardado",
            id: result.meta.last_row_id,
        }, 201);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return c.json({ success: false, error: "Datos invalidos", details: error.errors }, 400);
        }
        return c.json({ success: false, error: error.message }, 500);
    }
});

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
