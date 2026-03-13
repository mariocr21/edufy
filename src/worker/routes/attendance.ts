import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Bindings } from "../bindings";
import { requireAuth, requireRoles } from "../middleware/auth";
import { format } from "date-fns";

const attendance = new Hono<{ Bindings: Bindings }>();

// ── Schemas ──
const batchAttendanceSchema = z.object({
    schedule_id: z.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato yyyy-mm-dd"),
    records: z.array(
        z.object({
            student_id: z.number().int().positive(),
            status: z.enum(["present", "absent", "late", "justified"]),
        })
    ),
});

// ── GET /api/attendance/my-schedule ──
// Returns the teacher's schedule for a specific date
attendance.get("/my-schedule", requireAuth, requireRoles(["teacher", "admin"]), async (c) => {
    const user = c.get("user");
    const dateStr = c.req.query("date") || format(new Date(), "yyyy-MM-dd");
    
    // Get day of week (1=Mon, 2=Tue, etc.)
    const dateObj = new Date(dateStr);
    let dayOfWeek = dateObj.getDay(); 
    if (dayOfWeek === 0) dayOfWeek = 7; // Convert JS Sunday (0) to 7 if needed, though our DB uses 1-5 for Mon-Fri
    
    if (dayOfWeek > 5) {
        return c.json({ success: true, data: [], message: "No hay clases programadas en fin de semana" });
    }

    const db = c.env.DB;

    // Find the teacher ID for this user
    let teacherId: number | null = null;
    
    // Admins can optionally query a specific teacher's schedule
    const requestedTeacherId = c.req.query("teacher_id");
    if (user.role === "admin" && requestedTeacherId) {
        teacherId = parseInt(requestedTeacherId, 10);
    } else {
        const teacher = await db.prepare("SELECT id FROM teachers WHERE user_id = ?").bind(user.id).first<{id: number}>();
        if (!teacher) {
            return c.json({
                success: true,
                data: [],
                needs_setup: true,
                message: "Tu cuenta docente aún no está vinculada a un registro de maestro. Pide a administración que la vincule en Usuarios y Docentes.",
            });
        }
        teacherId = teacher.id;
    }

    // Get today's schedule
    const schedules = await db.prepare(`
        SELECT s.id as schedule_id, s.period_num, s.classroom,
               sub.name as subject_name, sub.short_code as subject_code,
               g.id as group_id, g.name as group_name, g.semester,
               (SELECT COUNT(*) FROM group_students gs WHERE gs.group_id = g.id) as total_students,
               (SELECT COUNT(*) FROM attendance a WHERE a.schedule_id = s.id AND a.date = ?) as recorded_attendance
        FROM schedules s
        JOIN subjects sub ON s.subject_id = sub.id
        JOIN groups_table g ON s.group_id = g.id
        WHERE s.teacher_id = ? AND s.day = ?
        ORDER BY s.period_num
    `).bind(dateStr, teacherId, dayOfWeek).all();

    return c.json({ success: true, data: schedules.results, date: dateStr, day: dayOfWeek });
});

// ── GET /api/attendance/group/:groupId/students ──
// Returns students in a group along with their attendance for a specific schedule and date
attendance.get("/group/:groupId/students", requireAuth, async (c) => {
    const groupId = c.req.param("groupId");
    const scheduleId = c.req.query("schedule_id");
    const dateStr = c.req.query("date") || format(new Date(), "yyyy-MM-dd");
    const db = c.env.DB;

    if (!scheduleId) return c.json({ success: false, error: "schedule_id requerido" }, 400);

    const students = await db.prepare(`
        SELECT st.id, st.no_control, st.name, st.paterno, st.materno, st.photo_url,
               COALESCE(a.status, 'present') as status,
               a.id as attendance_id
        FROM students st
        JOIN group_students gs ON st.id = gs.student_id
        LEFT JOIN attendance a ON st.id = a.student_id AND a.schedule_id = ? AND a.date = ?
        WHERE gs.group_id = ? AND st.active = 1
        ORDER BY st.paterno, st.materno, st.name
    `).bind(scheduleId, dateStr, groupId).all();

    return c.json({ success: true, data: students.results });
});

// ── POST /api/attendance/batch ──
// Save attendance for a whole group class
attendance.post("/batch", requireAuth, requireRoles(["teacher", "admin"]), zValidator("json", batchAttendanceSchema), async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const db = c.env.DB;

    // Perform batch insert/update using D1 batch api for performance
    const statements = body.records.map((record) => {
        return db.prepare(`
            INSERT INTO attendance (student_id, schedule_id, date, status, marked_by)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(student_id, schedule_id, date) DO UPDATE SET 
            status = excluded.status,
            marked_by = excluded.marked_by
        `).bind(record.student_id, body.schedule_id, body.date, record.status, user.id);
    });

    try {
        if (statements.length > 0) {
            await db.batch(statements);
        }
        return c.json({ success: true, message: `Asistencia guardada (${statements.length} registros)` });
    } catch {
        return c.json({ success: false, error: "Error guardando asistencia" }, 500);
    }
});

// ── GET /api/attendance/report ──
// Get attendance report with filters
attendance.get("/report", requireAuth, requireRoles(["admin", "prefect", "teacher"]), async (c) => {
    const db = c.env.DB;
    const groupId = c.req.query("group_id");
    const dateFrom = c.req.query("from");
    const dateTo = c.req.query("to");

    let query = `
        SELECT a.id, a.date, a.status,
               st.no_control, st.name as student_name, st.paterno, st.materno,
               g.name as group_name,
               sub.name as subject_name
        FROM attendance a
        JOIN students st ON a.student_id = st.id
        JOIN schedules s ON a.schedule_id = s.id
        JOIN groups_table g ON s.group_id = g.id
        JOIN subjects sub ON s.subject_id = sub.id
        WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (groupId) {
        query += " AND g.id = ?";
        params.push(Number(groupId));
    }
    if (dateFrom) {
        query += " AND a.date >= ?";
        params.push(dateFrom);
    }
    if (dateTo) {
        query += " AND a.date <= ?";
        params.push(dateTo);
    }

    query += " ORDER BY a.date DESC, g.name, st.paterno LIMIT 1000";

    const result = await db.prepare(query).bind(...params).all();
    return c.json({ success: true, data: result.results });
});

export { attendance as attendanceRoutes };
