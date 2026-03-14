import { Hono } from "hono";
import { ZodError, z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Bindings } from "../bindings";
import { requireAuth, requireRoles } from "../middleware/auth";
import {
    buildPrefectureWhatsappMessage,
    getPrefectureEventLabel,
    prefectureEventInputSchema,
    prefectureEventTypeSchema,
} from "../../shared/prefecture";
import {
    getPrimaryGuardianForStudent,
    insertPrefectureEvent,
} from "../lib/prefecture";

const prefecture = new Hono<{ Bindings: Bindings }>();

const createPrefectureEventSchema = prefectureEventInputSchema;

const justifyAttendanceSchema = z.object({
    reason: z.string().trim().min(1, "El motivo es obligatorio"),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato yyyy-mm-dd"),
    summary: z.string().trim().min(1).optional(),
    guardian_id: z.number().int().positive().optional().nullable(),
});

prefecture.get(
    "/students/:id/attendance-records",
    requireAuth,
    requireRoles(["admin", "prefect"]),
    async (c) => {
        const studentId = Number(c.req.param("id"));
        const db = c.env.DB;

        const records = await db.prepare(`
            SELECT
                a.id,
                a.date,
                a.status,
                s.id as schedule_id,
                s.period_num,
                sub.name as subject_name,
                g.name as group_name
            FROM attendance a
            JOIN schedules s ON s.id = a.schedule_id
            JOIN subjects sub ON sub.id = s.subject_id
            JOIN groups_table g ON g.id = s.group_id
            WHERE a.student_id = ?
            ORDER BY a.date DESC, a.id DESC
            LIMIT 20
        `)
            .bind(studentId)
            .all();

        return c.json({ success: true, data: records.results });
    },
);

prefecture.get(
    "/students/:id/timeline",
    requireAuth,
    requireRoles(["admin", "prefect"]),
    async (c) => {
        const studentId = Number(c.req.param("id"));
        const db = c.env.DB;

        const student = await db
            .prepare(`
                SELECT id, no_control, name, paterno, materno, grupo
                FROM students
                WHERE id = ? AND active = 1
            `)
            .bind(studentId)
            .first();

        if (!student) {
            return c.json({ success: false, error: "Alumno no encontrado" }, 404);
        }

        const timeline = await db.prepare(`
            SELECT
                pe.id,
                pe.student_id,
                pe.event_type,
                pe.event_date,
                pe.summary,
                pe.details,
                pe.created_by,
                pe.related_attendance_id,
                pe.related_conduct_id,
                pe.guardian_id,
                pe.whatsapp_message,
                pe.whatsapp_opened_at,
                pe.created_at,
                u.display_name as created_by_name,
                g.name as guardian_name,
                g.phone as guardian_phone
            FROM prefecture_events pe
            LEFT JOIN users u ON pe.created_by = u.id
            LEFT JOIN guardians g ON pe.guardian_id = g.id
            WHERE pe.student_id = ?
            ORDER BY pe.event_date DESC, pe.created_at DESC
        `)
            .bind(studentId)
            .all();

        return c.json({
            success: true,
            data: {
                student,
                timeline: timeline.results,
            },
        });
    },
);

prefecture.post(
    "/events",
    requireAuth,
    requireRoles(["admin", "prefect"]),
    zValidator("json", createPrefectureEventSchema),
    async (c) => {
        const body = c.req.valid("json");
        const user = c.get("user");
        const db = c.env.DB;

        const student = await db
            .prepare("SELECT id FROM students WHERE id = ? AND active = 1")
            .bind(body.student_id)
            .first();

        if (!student) {
            return c.json({ success: false, error: "Alumno no encontrado" }, 404);
        }

        if (body.guardian_id) {
            const guardian = await db
                .prepare("SELECT id FROM guardians WHERE id = ? AND student_id = ?")
                .bind(body.guardian_id, body.student_id)
                .first();

            if (!guardian) {
                return c.json({ success: false, error: "Tutor no encontrado para este alumno" }, 404);
            }
        }

        const eventId = await insertPrefectureEvent(db, {
            ...body,
            created_by: user.id,
        });

        return c.json({
            success: true,
            data: { id: eventId },
            message: "Evento registrado en prefectura",
        }, 201);
    },
);

prefecture.post(
    "/events/:id/whatsapp-preview",
    requireAuth,
    requireRoles(["admin", "prefect"]),
    async (c) => {
        const eventId = Number(c.req.param("id"));
        const db = c.env.DB;

        const event = await db.prepare(`
            SELECT
                pe.id,
                pe.student_id,
                pe.event_type,
                pe.event_date,
                pe.summary,
                pe.guardian_id,
                st.name,
                st.paterno,
                st.materno,
                st.grupo
            FROM prefecture_events pe
            JOIN students st ON st.id = pe.student_id
            WHERE pe.id = ?
        `)
            .bind(eventId)
            .first<{
                id: number;
                student_id: number;
                event_type: z.infer<typeof prefectureEventTypeSchema>;
                event_date: string;
                summary: string;
                guardian_id: number | null;
                name: string;
                paterno: string;
                materno: string | null;
                grupo: string | null;
            }>();

        if (!event) {
            return c.json({ success: false, error: "Evento no encontrado" }, 404);
        }

        const guardian = event.guardian_id
            ? await db
                .prepare("SELECT id, name, phone, relationship FROM guardians WHERE id = ?")
                .bind(event.guardian_id)
                .first<{ id: number; name: string; phone: string; relationship: string }>()
            : await getPrimaryGuardianForStudent(db, event.student_id);

        const studentName = [event.paterno, event.materno ?? "", event.name]
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

        const message = buildPrefectureWhatsappMessage({
            eventType: event.event_type,
            studentName,
            groupName: event.grupo,
            eventDate: event.event_date,
            summary: event.summary,
        });

        await db.prepare(`
            UPDATE prefecture_events
            SET whatsapp_message = ?
            WHERE id = ?
        `)
            .bind(message, eventId)
            .run();

        return c.json({
            success: true,
            data: {
                event_id: eventId,
                event_type: event.event_type,
                event_label: getPrefectureEventLabel(event.event_type),
                phone: guardian?.phone ?? null,
                guardian_name: guardian?.name ?? null,
                message,
            },
        });
    },
);

prefecture.post(
    "/events/:id/mark-whatsapp-opened",
    requireAuth,
    requireRoles(["admin", "prefect"]),
    async (c) => {
        const id = Number(c.req.param("id"));
        const db = c.env.DB;

        const result = await db.prepare(`
            UPDATE prefecture_events
            SET whatsapp_opened_at = datetime('now')
            WHERE id = ?
        `)
            .bind(id)
            .run();

        if (result.meta.changes === 0) {
            return c.json({ success: false, error: "Evento no encontrado" }, 404);
        }

        return c.json({ success: true, message: "Seguimiento de WhatsApp actualizado" });
    },
);

prefecture.post(
    "/attendance/:id/justify",
    requireAuth,
    requireRoles(["admin", "prefect"]),
    zValidator("json", justifyAttendanceSchema),
    async (c) => {
        const attendanceId = Number(c.req.param("id"));
        const body = c.req.valid("json");
        const user = c.get("user");
        const db = c.env.DB;

        const attendanceRecord = await db.prepare(`
            SELECT
                a.id,
                a.student_id,
                a.date,
                a.status,
                st.name,
                st.paterno,
                st.materno,
                st.grupo
            FROM attendance a
            JOIN students st ON st.id = a.student_id
            WHERE a.id = ?
        `)
            .bind(attendanceId)
            .first<{
                id: number;
                student_id: number;
                date: string;
                status: string;
                name: string;
                paterno: string;
                materno: string | null;
                grupo: string | null;
            }>();

        if (!attendanceRecord) {
            return c.json({ success: false, error: "Registro de asistencia no encontrado" }, 404);
        }

        let guardianId = body.guardian_id ?? null;
        if (guardianId) {
            const guardian = await db
                .prepare("SELECT id FROM guardians WHERE id = ? AND student_id = ?")
                .bind(guardianId, attendanceRecord.student_id)
                .first();

            if (!guardian) {
                return c.json({ success: false, error: "Tutor no encontrado para este alumno" }, 404);
            }
        } else {
            guardianId = (await getPrimaryGuardianForStudent(db, attendanceRecord.student_id))?.id ?? null;
        }

        await db.prepare(`
            UPDATE attendance
            SET status = 'justified', marked_by = ?
            WHERE id = ?
        `)
            .bind(user.id, attendanceId)
            .run();

        const studentFullName = [
            attendanceRecord.paterno,
            attendanceRecord.materno ?? "",
            attendanceRecord.name,
        ]
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

        const summary = body.summary?.trim() || `Falta justificada de ${studentFullName}`;
        const details = [
            `Motivo: ${body.reason}`,
            `Fecha de la falta: ${attendanceRecord.date}`,
            `Justificada por: ${user.email}`,
        ].join("\n");

        const eventId = await insertPrefectureEvent(db, {
            student_id: attendanceRecord.student_id,
            event_type: prefectureEventTypeSchema.enum.falta_justificada,
            event_date: body.event_date,
            summary,
            details,
            created_by: user.id,
            related_attendance_id: attendanceId,
            guardian_id: guardianId,
        });

        return c.json({
            success: true,
            message: "Falta justificada correctamente",
            data: {
                attendance_id: attendanceId,
                event_id: eventId,
                status: "justified",
            },
        });
    },
);

prefecture.onError((error, c) => {
    if (error instanceof ZodError) {
        return c.json({ success: false, error: "Datos invalidos", details: error.flatten() }, 400);
    }

    return c.json({ success: false, error: error.message || "Error interno en prefectura" }, 500);
});

export { prefecture as prefectureRoutes };
