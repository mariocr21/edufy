import { Hono } from "hono";
import type { Bindings } from "../bindings";
import { parseSisemsData, importSisemsToD1 } from "../parsers/sisems";
import { parseAscXml, importAscToD1 } from "../parsers/asc-timetables";
import * as XLSX from "xlsx";

const importRoutes = new Hono<{ Bindings: Bindings }>();

// ── GET /api/import/periods ── List available periods
importRoutes.get("/periods", async (c) => {
    const db = c.env.DB;
    const periods = await db
        .prepare("SELECT * FROM periods ORDER BY year DESC, id DESC")
        .all();
    return c.json({ success: true, data: periods.results });
});

// ── POST /api/import/period ── Create a new period
importRoutes.post("/period", async (c) => {
    const body = await c.req.json<{
        name: string;
        year: number;
        semester_type: "odd" | "even";
        start_date?: string;
        end_date?: string;
        active?: boolean;
    }>();

    const db = c.env.DB;

    // If setting this period as active, deactivate others
    if (body.active) {
        await db.prepare("UPDATE periods SET active = 0").run();
    }

    const result = await db
        .prepare("INSERT INTO periods (name, year, semester_type, start_date, end_date, active) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(body.name, body.year, body.semester_type, body.start_date || null, body.end_date || null, body.active ? 1 : 0)
        .run();

    return c.json({ success: true, data: { id: result.meta.last_row_id } }, 201);
});

// ── POST /api/import/sisems ── Upload SISEMS XLSX (multipart/form-data)
importRoutes.post("/sisems", async (c) => {
    const db = c.env.DB;

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const periodIdStr = formData.get("period_id") as string | null;

    if (!file) {
        return c.json({ success: false, error: "No se recibió archivo" }, 400);
    }
    if (!periodIdStr) {
        return c.json({ success: false, error: "Falta period_id" }, 400);
    }

    const periodId = parseInt(periodIdStr, 10);
    if (isNaN(periodId)) {
        return c.json({ success: false, error: "period_id inválido" }, 400);
    }

    try {
        // Parse XLSX
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return c.json({ success: false, error: "El archivo no contiene hojas" }, 400);
        }

        const sheet = workbook.Sheets[sheetName]!;
        const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
            header: 1,
            defval: null,
        });

        // Parse data
        const parsed = parseSisemsData(rows);

        // Import to D1
        const result = await importSisemsToD1(db, parsed, periodId);

        return c.json({
            success: true,
            data: {
                type: parsed.type,
                studentsFound: parsed.students.length,
                gradesFound: parsed.grades.length,
                ...result,
                warnings: parsed.warnings,
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        return c.json({ success: false, error: `Error procesando archivo: ${message}` }, 500);
    }
});

// ── POST /api/import/horarios ── Upload aSc Timetables XML
importRoutes.post("/horarios", async (c) => {
    const db = c.env.DB;

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const periodIdStr = formData.get("period_id") as string | null;

    if (!file) {
        return c.json({ success: false, error: "No se recibió archivo" }, 400);
    }
    if (!periodIdStr) {
        return c.json({ success: false, error: "Falta period_id" }, 400);
    }

    const periodId = parseInt(periodIdStr, 10);

    try {
        const xmlText = await file.text();
        const parsed = parseAscXml(xmlText);
        const result = await importAscToD1(db, parsed, periodId);

        return c.json({
            success: true,
            data: {
                teachersFound: parsed.teachers.length,
                subjectsFound: parsed.subjects.length,
                classesFound: parsed.classes.length,
                cardsFound: parsed.cards.length,
                ...result,
                warnings: parsed.warnings,
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        return c.json({ success: false, error: `Error procesando XML: ${message}` }, 500);
    }
});

// ── GET /api/import/history ── Import summary stats
importRoutes.get("/stats", async (c) => {
    const db = c.env.DB;

    const students = await db.prepare("SELECT COUNT(*) as count FROM students WHERE active=1").first<{ count: number }>();
    const teachers = await db.prepare("SELECT COUNT(*) as count FROM teachers").first<{ count: number }>();
    const subjects = await db.prepare("SELECT COUNT(*) as count FROM subjects").first<{ count: number }>();
    const groups = await db.prepare("SELECT COUNT(*) as count FROM groups_table").first<{ count: number }>();
    const schedules = await db.prepare("SELECT COUNT(*) as count FROM schedules").first<{ count: number }>();
    const grades = await db.prepare("SELECT COUNT(*) as count FROM grades").first<{ count: number }>();

    return c.json({
        success: true,
        data: {
            students: students?.count ?? 0,
            teachers: teachers?.count ?? 0,
            subjects: subjects?.count ?? 0,
            groups: groups?.count ?? 0,
            schedules: schedules?.count ?? 0,
            grades: grades?.count ?? 0,
        },
    });
});

export { importRoutes };
