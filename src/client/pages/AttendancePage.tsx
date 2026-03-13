import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
    AlertCircle,
    ArrowLeft,
    BarChart3,
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronRight,
    Clock,
    Clock4,
    Filter,
    MapPin,
    Save,
    Search,
    Users,
    XCircle,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";

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

interface ApiResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    needs_setup?: boolean;
}

const defaultDate = format(new Date(), "yyyy-MM-dd");
const defaultReportFrom = format(new Date(), "yyyy-MM-01");

export function AttendancePage() {
    const user = useAuthStore((s) => s.user);
    const token = useAuthStore((s) => s.token);
    const isPrefect = user?.role === "prefect";
    const canViewGeneralReport = user?.role === "admin" || user?.role === "prefect";

    const [date, setDate] = useState(defaultDate);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [setupMessage, setSetupMessage] = useState("");
    const [view, setView] = useState<"schedule" | "attendance" | "report">(isPrefect ? "report" : "schedule");
    const [activeTab, setActiveTab] = useState<"my_schedule" | "general_report">(isPrefect ? "general_report" : "my_schedule");
    const [selectedClass, setSelectedClass] = useState<ScheduleItem | null>(null);
    const [students, setStudents] = useState<StudentAttendance[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [reportParams, setReportParams] = useState({
        group_id: "",
        from: defaultReportFrom,
        to: defaultDate,
    });
    const [reportData, setReportData] = useState<AttendanceReportRow[]>([]);
    const [reportLoading, setReportLoading] = useState(false);
    const [groups, setGroups] = useState<Array<{ id: number; name: string }>>([]);

    const loadSchedule = useCallback(async (selectedDate: string) => {
        if (!token) return;

        try {
            setLoading(true);
            setError("");

            const res = await fetch(`/api/attendance/my-schedule?date=${selectedDate}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = (await res.json()) as ApiResult<ScheduleItem[]>;

            if (!res.ok || !payload.success) {
                setSchedules([]);
                setSetupMessage("");
                setError(payload.error || "No fue posible cargar tu horario.");
                return;
            }

            setSchedules(payload.data || []);
            setSetupMessage(payload.needs_setup ? payload.message || "Falta vincular la cuenta docente." : "");
        } catch (scheduleError) {
            console.error("Error loading schedule:", scheduleError);
            setSchedules([]);
            setSetupMessage("");
            setError("Error de conexion al cargar el horario.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    const handleSelectClass = async (cls: ScheduleItem) => {
        if (!token) return;

        try {
            setLoading(true);
            setError("");
            setSelectedClass(cls);
            setView("attendance");

            const res = await fetch(
                `/api/attendance/group/${cls.group_id}/students?schedule_id=${cls.schedule_id}&date=${date}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const payload = (await res.json()) as ApiResult<StudentAttendance[]>;

            if (!res.ok || !payload.success) {
                setStudents([]);
                setError(payload.error || "No fue posible cargar la lista del grupo.");
                return;
            }

            setStudents(payload.data || []);
        } catch (studentsError) {
            console.error("Error loading students:", studentsError);
            setStudents([]);
            setError("Error de conexion al cargar los alumnos.");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId: number, status: StudentAttendance["status"]) => {
        setStudents((prev) => prev.map((student) => (student.id === studentId ? { ...student, status } : student)));
    };

    const markAllAs = (status: StudentAttendance["status"]) => {
        setStudents((prev) => prev.map((student) => ({ ...student, status })));
    };

    const saveAttendance = async () => {
        if (!selectedClass || !token) return;

        try {
            setSaving(true);
            setError("");

            const res = await fetch("/api/attendance/batch", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    schedule_id: selectedClass.schedule_id,
                    date,
                    records: students.map((student) => ({
                        student_id: student.id,
                        status: student.status,
                    })),
                }),
            });
            const payload = (await res.json()) as ApiResult<unknown>;

            if (!res.ok || !payload.success) {
                setError(payload.error || "No fue posible guardar la asistencia.");
                return;
            }

            setView("schedule");
            setSelectedClass(null);
            setSearchQuery("");
            await loadSchedule(date);
        } catch (saveError) {
            console.error("Error saving attendance:", saveError);
            setError("Error de conexion al guardar asistencia.");
        } finally {
            setSaving(false);
        }
    };

    const loadReport = useCallback(async () => {
        if (!token) return;

        try {
            setReportLoading(true);
            setError("");

            const params = new URLSearchParams();
            if (reportParams.group_id) params.append("group_id", reportParams.group_id);
            if (reportParams.from) params.append("from", reportParams.from);
            if (reportParams.to) params.append("to", reportParams.to);

            const query = params.toString();
            const res = await fetch(`/api/attendance/report${query ? `?${query}` : ""}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = (await res.json()) as ApiResult<AttendanceReportRow[]>;

            if (!res.ok || !payload.success) {
                setReportData([]);
                setError(payload.error || "No fue posible cargar el reporte de asistencia.");
                return;
            }

            setReportData(payload.data || []);
        } catch (reportError) {
            console.error("Error loading attendance report:", reportError);
            setReportData([]);
            setError("Error de conexion al cargar el reporte.");
        } finally {
            setReportLoading(false);
        }
    }, [reportParams.from, reportParams.group_id, reportParams.to, token]);

    useEffect(() => {
        if (isPrefect) {
            setActiveTab("general_report");
            setView("report");
        }
    }, [isPrefect]);

    useEffect(() => {
        if (!canViewGeneralReport || !token) return;

        fetch("/api/catalogs/groups", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (res) => {
                const payload = (await res.json()) as ApiResult<Array<{ id: number; name: string }>>;
                if (!res.ok || !payload.success) {
                    throw new Error(payload.error || "No fue posible cargar grupos");
                }
                setGroups(payload.data || []);
            })
            .catch((catalogError) => {
                console.error("Error loading groups catalog:", catalogError);
                setError("No fue posible cargar el catalogo de grupos.");
            });
    }, [canViewGeneralReport, token]);

    useEffect(() => {
        if (!token || isPrefect) return;
        if (view === "schedule" && activeTab === "my_schedule") {
            void loadSchedule(date);
        }
    }, [activeTab, date, isPrefect, loadSchedule, token, view]);

    useEffect(() => {
        if (view === "report" && canViewGeneralReport) {
            void loadReport();
        }
    }, [canViewGeneralReport, loadReport, view]);

    const handleTabChange = (tab: "my_schedule" | "general_report") => {
        setError("");
        setActiveTab(tab);
        setView(tab === "general_report" ? "report" : "schedule");
    };

    const filteredStudents = students.filter((student) => {
        const fullName = `${student.paterno} ${student.materno} ${student.name}`.toLowerCase();
        const term = searchQuery.toLowerCase();
        return fullName.includes(term) || student.no_control.toLowerCase().includes(term);
    });

    const presentCount = students.filter((student) => student.status === "present").length;

    const getStatusIcon = (status: StudentAttendance["status"]) => {
        switch (status) {
            case "present":
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case "absent":
                return <XCircle className="w-5 h-5 text-red-500" />;
            case "late":
                return <Clock4 className="w-5 h-5 text-yellow-500" />;
            case "justified":
                return <AlertCircle className="w-5 h-5 text-blue-500" />;
        }
    };

    if (view === "attendance" && selectedClass) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                    <button
                        onClick={() => {
                            setView("schedule");
                            setError("");
                        }}
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
                                    Modulo {selectedClass.period_num}
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
                                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                    Presentes
                                </span>
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
                        <button
                            onClick={() => markAllAs("present")}
                            className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Todos Presentes"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => markAllAs("absent")}
                            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Todos Ausentes"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin mb-4" />
                            Cargando lista de alumnos...
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredStudents.map((student, idx) => (
                                <div
                                    key={student.id}
                                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-medium border border-gray-200 flex-shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-sm sm:text-base font-medium text-gray-900 leading-tight">
                                                {student.paterno} {student.materno} {student.name}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{student.no_control}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:gap-3 bg-gray-100/50 p-1.5 rounded-lg border border-gray-200/50 ml-14 sm:ml-0">
                                        {(["present", "absent", "late", "justified"] as const).map((status) => {
                                            const isSelected = student.status === status;
                                            const baseClass = "hover:bg-gray-200 text-gray-400";
                                            let activeClass = "";

                                            if (status === "present" && isSelected) activeClass = "bg-green-100 text-green-700 shadow-sm border-green-200";
                                            if (status === "absent" && isSelected) activeClass = "bg-red-100 text-red-700 shadow-sm border-red-200";
                                            if (status === "late" && isSelected) activeClass = "bg-yellow-100 text-yellow-700 shadow-sm border-yellow-200";
                                            if (status === "justified" && isSelected) activeClass = "bg-blue-100 text-blue-700 shadow-sm border-blue-200";

                                            return (
                                                <button
                                                    key={status}
                                                    onClick={() => handleStatusChange(student.id, status)}
                                                    className={`p-2 sm:px-3 sm:py-2 flex items-center justify-center rounded-md border border-transparent transition-all duration-200 ${isSelected ? activeClass : baseClass}`}
                                                    title={status}
                                                >
                                                    {getStatusIcon(status)}
                                                    <span className="hidden sm:block ml-2 text-xs font-medium capitalize">
                                                        {status === "present"
                                                            ? "Presente"
                                                            : status === "absent"
                                                              ? "Ausente"
                                                              : status === "late"
                                                                ? "Retardo"
                                                                : "Justificado"}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {filteredStudents.length === 0 && (
                                <div className="p-12 text-center text-gray-500">No se encontraron alumnos</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Control de Asistencia</h1>
                    {activeTab === "my_schedule" && (
                        <p className="text-gray-500 mt-1">Selecciona una clase para pasar lista</p>
                    )}
                    {activeTab === "general_report" && (
                        <p className="text-gray-500 mt-1">Consulta la asistencia general por fecha y grupo</p>
                    )}
                </div>

                {canViewGeneralReport && view !== "attendance" && (
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {!isPrefect && (
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
                        )}
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

                {!isPrefect && activeTab === "my_schedule" && (
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

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {setupMessage && activeTab === "my_schedule" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Falta configurar la cuenta docente</h2>
                            <p className="mt-2 text-sm text-gray-700">{setupMessage}</p>
                            <p className="mt-2 text-sm text-gray-600">
                                Flujo recomendado: crea o revisa la cuenta en Usuarios, luego vinculala en Docentes.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {view === "report" && (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Grupo</label>
                            <select
                                value={reportParams.group_id}
                                onChange={(e) => setReportParams((prev) => ({ ...prev, group_id: e.target.value }))}
                                className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                            >
                                <option value="">Todos los grupos</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
                            <input
                                type="date"
                                value={reportParams.from}
                                onChange={(e) => setReportParams((prev) => ({ ...prev, from: e.target.value }))}
                                className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                            <input
                                type="date"
                                value={reportParams.to}
                                onChange={(e) => setReportParams((prev) => ({ ...prev, to: e.target.value }))}
                                className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                onClick={() => void loadReport()}
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
                                                    <div className="font-medium text-gray-900">
                                                        {row.paterno} {row.materno} {row.student_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{row.no_control}</div>
                                                </td>
                                                <td className="px-6 py-3 text-gray-600">{row.group_name}</td>
                                                <td className="px-6 py-3 text-gray-600 truncate max-w-[200px]" title={row.subject_name}>
                                                    {row.subject_name}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                            row.status === "present"
                                                                ? "bg-green-100 text-green-700"
                                                                : row.status === "absent"
                                                                  ? "bg-red-100 text-red-700"
                                                                  : row.status === "late"
                                                                    ? "bg-yellow-100 text-yellow-700"
                                                                    : "bg-blue-100 text-blue-700"
                                                        }`}
                                                    >
                                                        {row.status === "present"
                                                            ? "Presente"
                                                            : row.status === "absent"
                                                              ? "Ausente"
                                                              : row.status === "late"
                                                                ? "Retardo"
                                                                : "Justificado"}
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

            {activeTab === "my_schedule" && !setupMessage && (
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
                                        onClick={() => void handleSelectClass(cls)}
                                        className={`group relative bg-white flex flex-col rounded-2xl border transition-all duration-200 hover:shadow-md cursor-pointer overflow-hidden ${
                                            isComplete ? "border-green-200" : "border-gray-200 hover:border-brand-300"
                                        }`}
                                    >
                                        <div className={`h-2 w-full ${isComplete ? "bg-green-500" : "bg-brand-500"}`} />
                                        <div className="p-5 flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="bg-gray-50 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-md border border-gray-200 flex items-center">
                                                    Modulo {cls.period_num}
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
                                                <div
                                                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                                        isComplete
                                                            ? "bg-green-50 text-green-700"
                                                            : "bg-brand-50 text-brand-700 group-hover:bg-brand-100"
                                                    }`}
                                                >
                                                    <span>{isComplete ? "Editar lista" : "Pasar lista"}</span>
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
