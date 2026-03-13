import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
    Calendar as CalendarIcon,
    Clock,
    Users,
    MapPin,
    ChevronRight,
    Search,
    CheckCircle2,
    XCircle,
    Clock4,
    AlertCircle,
    ArrowLeft,
    Save,
    BarChart3,
    Filter
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";

// Type definitions
interface ScheduleItem {
    schedule_id: number;
    period_num: number;
    classroom: string | null;
    subject_name: string;
    subject_code: string;
    group_id: number;
    group_name: string;
    semester: number;
    total_students: number;
    recorded_attendance: number;
}

interface StudentAttendance {
    id: number;
    no_control: string;
    name: string;
    paterno: string;
    materno: string;
    photo_url: string | null;
    status: "present" | "absent" | "late" | "justified";
    attendance_id: number | null;
}

interface AttendanceReportRow {
    id: number;
    date: string;
    status: "present" | "absent" | "late" | "justified";
    no_control: string;
    student_name: string;
    paterno: string;
    materno: string;
    group_name: string;
    subject_name: string;
}

export function AttendancePage() {
    const user = useAuthStore((s) => s.user);
    const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(false);
    
    // View state: 'schedule' or 'taking_attendance' or 'report'
    const [view, setView] = useState<"schedule" | "attendance" | "report">("schedule");
    // Tab state for admins/prefects
    const [activeTab, setActiveTab] = useState<"my_schedule" | "general_report">("my_schedule");
    
    const [selectedClass, setSelectedClass] = useState<ScheduleItem | null>(null);
    const [students, setStudents] = useState<StudentAttendance[]>([]);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Report state
    const [reportParams, setReportParams] = useState({
        group_id: "",
        from: format(new Date(), "yyyy-MM-01"),
        to: format(new Date(), "yyyy-MM-dd")
    });
    const [reportData, setReportData] = useState<AttendanceReportRow[]>([]);
    const [reportLoading, setReportLoading] = useState(false);
    
    // Load catalogs for report filters
    const [groups, setGroups] = useState<{id: number, name: string}[]>([]);

    // Load schedule when date changes or returning to schedule view
    useEffect(() => {
        if (view === "schedule" && activeTab === "my_schedule") {
            loadSchedule(date);
        }
    }, [date, view, activeTab]);

    useEffect(() => {
        if (user?.role === "admin" || user?.role === "prefect") {
            // Load groups for the filter dropdown
            fetch("/api/catalogs/groups", {
                headers: { Authorization: `Bearer ${useAuthStore.getState().token}` }
            })
            .then(res => res.json() as Promise<{ success: boolean; data: {id: number, name: string}[] }>)
            .then(data => {
                if(data.success) setGroups(data.data);
            })
            .catch(console.error);
        }
    }, [user?.role]);

    const loadSchedule = async (selectedDate: string) => {
        try {
            setLoading(true);
            const token = useAuthStore.getState().token;
            const res = await fetch(`/api/attendance/my-schedule?date=${selectedDate}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json() as { success: boolean; data?: ScheduleItem[] };
            if (data.success) {
                setSchedules(data.data || []);
            }
        } catch (error) {
            console.error("Error loading schedule:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectClass = async (cls: ScheduleItem) => {
        setSelectedClass(cls);
        setView("attendance");
        try {
            setLoading(true);
            const token = useAuthStore.getState().token;
            const res = await fetch(`/api/attendance/group/${cls.group_id}/students?schedule_id=${cls.schedule_id}&date=${date}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json() as { success: boolean; data?: StudentAttendance[] };
            if (data.success) {
                setStudents(data.data || []);
            }
        } catch (error) {
            console.error("Error loading students:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId: number, status: StudentAttendance["status"]) => {
        setStudents(prev => 
            prev.map(s => s.id === studentId ? { ...s, status } : s)
        );
    };

    const markAllAs = (status: StudentAttendance["status"]) => {
        setStudents(prev => prev.map(s => ({ ...s, status })));
    };

    const saveAttendance = async () => {
        if (!selectedClass) return;
        try {
            setSaving(true);
            const token = useAuthStore.getState().token;
            const payload = {
                schedule_id: selectedClass.schedule_id,
                date: date,
                records: students.map(s => ({
                    student_id: s.id,
                    status: s.status
                }))
            };

            const res = await fetch("/api/attendance/batch", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json() as { success: boolean; error?: string };
            if (data.success) {
                // Return to schedule view
                setView("schedule");
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            console.error("Error saving attendance:", error);
            alert("Error de conexión al guardar asistencia");
        } finally {
            setSaving(false);
        }
    };

    const loadReport = async () => {
        try {
            setReportLoading(true);
            const token = useAuthStore.getState().token;
            const params = new URLSearchParams();
            if (reportParams.group_id) params.append("group_id", reportParams.group_id);
            if (reportParams.from) params.append("from", reportParams.from);
            if (reportParams.to) params.append("to", reportParams.to);

            const res = await fetch(`/api/attendance/report?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json() as { success: boolean; data?: AttendanceReportRow[] };
            if (data.success) {
                setReportData(data.data || []);
            }
        } catch (error) {
            console.error("Error loading report:", error);
        } finally {
            setReportLoading(false);
        }
    };

    const handleTabChange = (tab: "my_schedule" | "general_report") => {
        setActiveTab(tab);
        if (tab === "general_report") {
            setView("report");
            loadReport();
        } else {
            setView("schedule");
        }
    };

    const filteredStudents = students.filter(s => {
        const fullName = `${s.paterno} ${s.materno} ${s.name}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase()) || 
               s.no_control.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const getStatusIcon = (status: StudentAttendance["status"]) => {
        switch (status) {
            case "present": return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case "absent": return <XCircle className="w-5 h-5 text-red-500" />;
            case "late": return <Clock4 className="w-5 h-5 text-yellow-500" />;
            case "justified": return <AlertCircle className="w-5 h-5 text-blue-500" />;
        }
    };

    // Calculate generic stats for the header
    const presentCount = students.filter(s => s.status === 'present').length;
    
    // UI: Taking Attendance View
    if (view === "attendance" && selectedClass) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                    <button 
                        onClick={() => setView("schedule")}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Volver a mi horario
                    </button>
                    
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                Pase de Lista: {selectedClass.group_name}
                            </h1>
                            <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                                <span className="flex items-center bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                                    <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                                    Módulo {selectedClass.period_num}
                                </span>
                                <span className="flex items-center bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                                    <CalendarIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                    {format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}
                                </span>
                                <span className="flex items-center bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-medium">
                                    {selectedClass.subject_name}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 flex flex-col justify-center items-center flex-shrink-0">
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Presentes</span>
                                <span className="text-xl font-bold text-gray-900">
                                    {presentCount} <span className="text-sm text-gray-400 font-normal">/ {students.length}</span>
                                </span>
                            </div>
                            <button
                                onClick={saveAttendance}
                                disabled={saving}
                                className="inline-flex items-center justify-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 min-w-[140px]"
                            >
                                {saving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar Lista
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar alumno..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow"
                        />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <span className="text-sm text-gray-500 mr-2">Marcar todos:</span>
                        <button onClick={() => markAllAs('present')} className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Todos Presentes">
                            <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => markAllAs('absent')} className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Todos Ausentes">
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Students List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin mb-4" />
                            Cargando lista de alumnos...
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredStudents.map((student, idx) => (
                                <div key={student.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium border border-gray-200 flex-shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-sm sm:text-base font-medium text-gray-900 leading-tight">
                                                {student.paterno} {student.materno} {student.name}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                                {student.no_control}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 sm:gap-3 bg-gray-100/50 p-1.5 rounded-lg border border-gray-200/50 ml-14 sm:ml-0">
                                        {(["present", "absent", "late", "justified"] as const).map((status) => {
                                            const isSelected = student.status === status;
                                            
                                            const bgClass = "hover:bg-gray-200 text-gray-400";
                                            let activeClass = "";
                                            
                                            // Conditional styling based on status
                                            if (status === "present" && isSelected) activeClass = "bg-green-100 text-green-700 shadow-sm border-green-200";
                                            if (status === "absent" && isSelected) activeClass = "bg-red-100 text-red-700 shadow-sm border-red-200";
                                            if (status === "late" && isSelected) activeClass = "bg-yellow-100 text-yellow-700 shadow-sm border-yellow-200";
                                            if (status === "justified" && isSelected) activeClass = "bg-blue-100 text-blue-700 shadow-sm border-blue-200";

                                            return (
                                                <button
                                                    key={status}
                                                    onClick={() => handleStatusChange(student.id, status)}
                                                    className={`p-2 sm:px-3 sm:py-2 flex items-center justify-center rounded-md border border-transparent transition-all duration-200 ${isSelected ? activeClass : bgClass}`}
                                                    title={status.charAt(0).toUpperCase() + status.slice(1)}
                                                >
                                                    {getStatusIcon(status)}
                                                    <span className="hidden sm:block ml-2 text-xs font-medium capitalize">
                                                        {status === 'present' ? 'Presente' : 
                                                         status === 'absent' ? 'Ausente' : 
                                                         status === 'late' ? 'Retardo' : 'Justificado'}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                            {filteredStudents.length === 0 && (
                                <div className="p-12 text-center text-gray-500">
                                    No se encontraron alumnos
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // UI: Daily Schedule View
    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Control de Asistencia</h1>
                    {activeTab === "my_schedule" && (
                        <p className="text-gray-500 mt-1">Selecciona una clase para pasar lista</p>
                    )}
                </div>

                {/* Tabs for Admin/Prefect */}
                {(user?.role === "admin" || user?.role === "prefect") && view !== "attendance" && (
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => handleTabChange("my_schedule")}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === "my_schedule" 
                                ? "bg-white text-gray-900 shadow-sm" 
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Mi Horario
                        </button>
                        <button
                            onClick={() => handleTabChange("general_report")}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === "general_report" 
                                ? "bg-white text-gray-900 shadow-sm" 
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Reporte General
                        </button>
                    </div>
                )}
                
                {activeTab === "my_schedule" && (
                    <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center">
                        <CalendarIcon className="w-5 h-5 text-brand-500 mr-2" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="text-sm font-medium text-gray-700 border-none p-0 focus:ring-0 cursor-pointer bg-transparent"
                        />
                    </div>
                )}
            </div>

            {/* Admin Report View */}
            {view === "report" && (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Grupo</label>
                            <select 
                                value={reportParams.group_id}
                                onChange={e => setReportParams(prev => ({...prev, group_id: e.target.value}))}
                                className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                            >
                                <option value="">Todos los grupos</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                            <input 
                                type="date" 
                                value={reportParams.from}
                                onChange={e => setReportParams(prev => ({...prev, from: e.target.value}))}
                                className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                            <input 
                                type="date" 
                                value={reportParams.to}
                                onChange={e => setReportParams(prev => ({...prev, to: e.target.value}))}
                                className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button 
                                onClick={loadReport}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center h-[38px]"
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Filtrar
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {reportLoading ? (
                            <div className="flex justify-center p-12">
                                <div className="w-8 h-8 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
                            </div>
                        ) : reportData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3">Fecha</th>
                                            <th className="px-6 py-3">Alumno</th>
                                            <th className="px-6 py-3">Grupo</th>
                                            <th className="px-6 py-3">Materia</th>
                                            <th className="px-6 py-3">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {reportData.map((row) => (
                                            <tr key={row.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 font-medium text-gray-900">
                                                    {format(parseISO(row.date), "dd/MM/yyyy")}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="font-medium text-gray-900">{row.paterno} {row.materno} {row.student_name}</div>
                                                    <div className="text-xs text-gray-500">{row.no_control}</div>
                                                </td>
                                                <td className="px-6 py-3 text-gray-600">{row.group_name}</td>
                                                <td className="px-6 py-3 text-gray-600 truncate max-w-[200px]" title={row.subject_name}>{row.subject_name}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium 
                                                        ${row.status === 'present' ? 'bg-green-100 text-green-700' : 
                                                          row.status === 'absent' ? 'bg-red-100 text-red-700' : 
                                                          row.status === 'late' ? 'bg-yellow-100 text-yellow-700' : 
                                                          'bg-blue-100 text-blue-700'}`
                                                    }>
                                                        {row.status === 'present' ? 'Presente' : 
                                                         row.status === 'absent' ? 'Ausente' : 
                                                         row.status === 'late' ? 'Retardo' : 'Justificado'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center text-gray-500">
                                No se encontraron registros de asistencia para estos filtros.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Schedule List */}
            {activeTab === "my_schedule" && (
                <>
                {loading ? (
                <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
                </div>
            ) : schedules.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {schedules.map((cls) => {
                        const isComplete = cls.recorded_attendance > 0;
                        
                        return (
                            <div 
                                key={cls.schedule_id}
                                onClick={() => handleSelectClass(cls)}
                                className={`
                                    group relative bg-white flex flex-col rounded-2xl border transition-all duration-200 hover:shadow-md cursor-pointer overflow-hidden
                                    ${isComplete ? 'border-green-200' : 'border-gray-200 hover:border-brand-300'}
                                `}
                            >
                                {/* Top decoration bar */}
                                <div className={`h-2 w-full ${isComplete ? 'bg-green-500' : 'bg-brand-500'}`} />
                                
                                <div className="p-5 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-gray-50 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-md border border-gray-200 flex items-center">
                                            Módulo {cls.period_num}
                                        </div>
                                        {isComplete ? (
                                            <span className="flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                Lista tomada
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                                Pendiente
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2 leading-tight">
                                        {cls.subject_name}
                                    </h3>
                                    
                                    <div className="mt-4 space-y-2.5">
                                        <div className="flex items-center text-gray-600 text-sm">
                                            <Users className="w-4 h-4 mr-2.5 text-gray-400" />
                                            Grupo {cls.group_name} ({cls.total_students} alumnos)
                                        </div>
                                        {cls.classroom && (
                                            <div className="flex items-center text-gray-600 text-sm">
                                                <MapPin className="w-4 h-4 mr-2.5 text-gray-400" />
                                                Aula {cls.classroom}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-auto pt-5">
                                        <div className={`
                                            flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                                            ${isComplete ? 'bg-green-50 text-green-700' : 'bg-brand-50 text-brand-700 group-hover:bg-brand-100'}
                                        `}>
                                            <span>{isComplete ? 'Editar lista' : 'Pasar lista'}</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <CalendarIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No hay clases programadas</h3>
                    <p className="mt-1 text-gray-500 max-w-sm mx-auto">
                        No tienes clases registradas en tu horario para la fecha seleccionada.
                    </p>
                </div>
            )}
            </>
            )}
        </div>
    );
}
