import { Hono } from "hono";
import type { Bindings } from "../bindings";
import { requireAuth } from "../middleware/auth";

const dashboard = new Hono<{ Bindings: Bindings }>();

dashboard.get("/stats", requireAuth, async (c) => {
    const db = c.env.DB;

    try {
        const totalStudentsResult = await db
            .prepare("SELECT COUNT(*) as count FROM students WHERE active = 1")
            .first<{ count: number }>();
        const totalStudents = totalStudentsResult?.count || 0;

        const todayAttendanceResult = await db
            .prepare(`
                SELECT COUNT(DISTINCT student_id) as count
                FROM attendance
                WHERE date = date('now', 'localtime') AND status IN ('present', 'late')
            `)
            .first<{ count: number }>();
        const presentToday = todayAttendanceResult?.count || 0;

        const attendanceRate =
            totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

        const activePeriod = await db
            .prepare("SELECT id, name FROM periods WHERE active = 1 LIMIT 1")
            .first<{ id: number; name: string }>();

        const totalTeachers = await db
            .prepare("SELECT COUNT(*) as count FROM teachers")
            .first<{ count: number }>();

        const totalGroups = activePeriod
            ? await db
                  .prepare("SELECT COUNT(*) as count FROM groups_table WHERE period_id = ?")
                  .bind(activePeriod.id)
                  .first<{ count: number }>()
            : { count: 0 };

        const attendanceByGroup = await db
            .prepare(`
                SELECT g.name as group_name,
                       COUNT(a.id) as total_records,
                       SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) as present_records
                FROM groups_table g
                JOIN group_students gs ON g.id = gs.group_id
                LEFT JOIN attendance a
                    ON gs.student_id = a.student_id
                   AND a.date = date('now', 'localtime')
                ${activePeriod ? "WHERE g.period_id = ?" : ""}
                GROUP BY g.id, g.name
                ORDER BY g.name
                LIMIT 10
            `);

        const attendanceByGroupResult = activePeriod
            ? await attendanceByGroup.bind(activePeriod.id).all<{
                  group_name: string;
                  total_records: number | null;
                  present_records: number | null;
              }>()
            : await attendanceByGroup.all<{
                  group_name: string;
                  total_records: number | null;
                  present_records: number | null;
              }>();

        const chartData = attendanceByGroupResult.results.map((row) => {
            const totalRecords = row.total_records || 0;
            const presentRecords = row.present_records || 0;

            return {
                name: row.group_name,
                asistencia: totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0,
            };
        });

        const recentIncidents = await db
            .prepare(`
                SELECT cr.id, cr.type, cr.description, cr.date, st.name, st.paterno
                FROM conduct_reports cr
                JOIN students st ON cr.student_id = st.id
                ORDER BY cr.date DESC, cr.id DESC
                LIMIT 5
            `)
            .all();

        return c.json({
            success: true,
            data: {
                summary: {
                    totalStudents,
                    totalTeachers: totalTeachers?.count || 0,
                    totalGroups: totalGroups?.count || 0,
                    attendanceRate,
                },
                charts: {
                    attendanceByGroup: chartData,
                },
                recentIncidents: recentIncidents.results,
                activePeriodName: activePeriod?.name || "Sin período activo",
            },
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

export { dashboard as dashboardRoutes };
