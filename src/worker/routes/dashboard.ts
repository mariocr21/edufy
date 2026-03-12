import { Hono } from "hono";
import type { Bindings } from "../bindings";
import { requireAuth } from "../middleware/auth";

const dashboard = new Hono<{ Bindings: Bindings }>();

dashboard.get("/stats", requireAuth, async (c) => {
    const db = c.env.DB;
    // Basic stats for the dashboard widget
    
    try {
        // Today's attendance calculation
        // Total students
        const totalStudentsResult = await db.prepare("SELECT COUNT(*) as count FROM students WHERE active = 1").first<{count: number}>();
        const totalStudents = totalStudentsResult?.count || 0;
        
        // Students with attendance records today
        const todayAttendanceResult = await db.prepare(`
            SELECT COUNT(DISTINCT student_id) as count 
            FROM attendance 
            WHERE date = date('now', 'localtime') AND status IN ('presente', 'retardo')
        `).first<{count: number}>();
        const presentToday = todayAttendanceResult?.count || 0;
        
        let attendanceRate = 0;
        if (totalStudents > 0) {
            attendanceRate = Math.round((presentToday / totalStudents) * 100);
        }

        // Active periods
        const activePeriod = await db.prepare("SELECT id, name FROM periods WHERE is_active = 1 LIMIT 1").first<{id: number, name: string}>();
        
        // General Statistics for dashboard
        const totalTeachers = await db.prepare("SELECT COUNT(*) as count FROM teachers WHERE active = 1").first<{count: number}>();
        const totalGroups = activePeriod ? await db.prepare("SELECT COUNT(*) as count FROM groups_table WHERE period_id = ?").bind(activePeriod.id).first<{count: number}>() : {count: 0};

        // Attendance by group (for chart)
        const attendanceByGroup = await db.prepare(`
            SELECT g.name as group_name, 
                   COUNT(a.id) as total_records,
                   SUM(CASE WHEN a.status IN ('presente', 'retardo') THEN 1 ELSE 0 END) as present_records
            FROM groups_table g
            JOIN group_students gs ON g.id = gs.group_id
            LEFT JOIN attendance a ON gs.student_id = a.student_id AND a.date = date('now', 'localtime')
            ${activePeriod ? 'WHERE g.period_id = ' + activePeriod.id : ''}
            GROUP BY g.id, g.name
            ORDER BY g.name
            LIMIT 10
        `).all();

        const chartData = attendanceByGroup.results.map((r: any) => ({
            name: r.group_name,
            asistencia: r.total_records > 0 ? Math.round((r.present_records / r.total_records) * 100) : 0
        }));

        // Recent conduct reports
        const recentIncidents = await db.prepare(`
            SELECT cr.id, cr.report_type, cr.description, cr.date, st.name, st.paterno
            FROM conduct_reports cr
            JOIN students st ON cr.student_id = st.id
            ORDER BY cr.date DESC, cr.created_at DESC
            LIMIT 5
        `).all();

        return c.json({
            success: true,
            data: {
                summary: {
                    totalStudents,
                    totalTeachers: totalTeachers?.count || 0,
                    totalGroups: totalGroups?.count || 0,
                    attendanceRate
                },
                charts: {
                    attendanceByGroup: chartData
                },
                recentIncidents: recentIncidents.results,
                activePeriodName: activePeriod?.name || "Sin período activo"
            }
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

export { dashboard as dashboardRoutes };
