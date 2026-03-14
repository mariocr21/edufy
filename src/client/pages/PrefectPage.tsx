import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
    AlertTriangle,
    CheckCircle2,
    Eye,
    FileText,
    LoaderCircle,
    Phone,
    Search,
    ShieldAlert,
    Trash2,
    UserCircle,
    UserSquare2,
    X,
} from "lucide-react";
import { StudentProfileCard } from "../components/students/StudentProfileCard";
import type { StudentProfileData } from "../components/students/types";
import {
    PrefectureQuickActions,
    type PrefectureActionType,
} from "../components/prefecture/PrefectureQuickActions";
import { PrefectureTimeline } from "../components/prefecture/PrefectureTimeline";
import { useAuthStore } from "../stores/authStore";
import {
    buildPrefectureWhatsappMessage,
    conductBehaviorCatalog,
    conductCategoryCatalog,
    conductSeverityCatalog,
    getConductBehaviorLabel,
    getConductCategoryLabel,
    getConductSeverityLabel,
    getJustificationEvidenceLabel,
    getJustificationReasonLabel,
    getPrefectureEventLabel,
    justificationEvidenceCatalog,
    justificationReasonCatalog,
    type PrefectureTimelineEvent,
} from "../../shared/prefecture";

interface Student {
    id: number;
    no_control: string;
    name: string;
    paterno: string;
    materno: string;
    grupo: string;
}

interface ConductReport {
    id: number;
    student_id: number;
    reported_by_name: string;
    report_type: "amonestacion" | "suspension" | "nota";
    description: string;
    date: string;
    created_at: string;
    student_name?: string;
    paterno?: string;
    materno?: string;
    no_control?: string;
    grupo?: string;
}

interface AttendanceRecord {
    id: number;
    date: string;
    status: "present" | "absent" | "late" | "justified";
    schedule_id: number;
    period_num: number;
    subject_name: string;
    group_name: string;
}

interface ApiResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

type FeedbackState = { type: "success" | "error"; text: string } | null;

const incidentTypeLabels: Record<string, string> = {
    amonestacion: "Amonestacion",
    suspension: "Suspension",
    nota: "Nota",
    warning: "Amonestacion",
    note: "Nota",
};

const documentTypeLabels: Record<string, string> = {
    photo: "Fotografia",
    acta_nacimiento: "Acta de nacimiento",
    curp: "CURP",
    certificado_secundaria: "Certificado de secundaria",
    comprobante_domicilio: "Comprobante de domicilio",
    other: "Otro",
};

const actionTitles: Record<PrefectureActionType, string> = {
    conducta: "Registrar conducta",
    falta_justificada: "Justificar falta",
    retardo: "Registrar retardo",
    salida: "Registrar salida",
    citatorio: "Crear citatorio",
    observacion: "Agregar observacion",
    contacto_tutor: "Notificar tutor",
};

export function PrefectPage() {
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState<ConductReport[]>([]);
    const [feedback, setFeedback] = useState<FeedbackState>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchingStudents, setSearchingStudents] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [studentProfile, setStudentProfile] = useState<StudentProfileData | null>(null);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [timeline, setTimeline] = useState<PrefectureTimelineEvent[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [activeAction, setActiveAction] = useState<PrefectureActionType | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [conductForm, setConductForm] = useState({
        report_type: "amonestacion" as "amonestacion" | "suspension" | "nota",
        category: "disciplina",
        severity: "leve",
        behavior: "interrumpe_clase",
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
        prepare_whatsapp: true,
    });
    const [eventForm, setEventForm] = useState({
        event_date: format(new Date(), "yyyy-MM-dd"),
        summary: "",
        details: "",
    });
    const [justifyForm, setJustifyForm] = useState({
        attendance_id: "",
        event_date: format(new Date(), "yyyy-MM-dd"),
        reason_key: "cita_medica",
        evidence_key: "constancia",
        summary: "Falta justificada",
        notes: "",
        prepare_whatsapp: true,
    });

    const request = async <T,>(url: string, options?: RequestInit) => {
        const token = useAuthStore.getState().token;
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options?.headers,
            },
        });

        const payload = await response.json() as ApiResult<T>;
        return { response, payload };
    };

    const loadRecentReports = useCallback(async () => {
        try {
            setLoading(true);
            const { payload } = await request<ConductReport[]>("/api/conduct/recent?limit=50");
            if (payload.success) {
                setReports(payload.data || []);
            }
        } catch (error) {
            console.error("Error loading reports:", error);
            setFeedback({ type: "error", text: "No se pudieron cargar los reportes recientes." });
        } finally {
            setLoading(false);
        }
    }, []);

    const searchStudents = useCallback(async (query: string) => {
        try {
            setSearchingStudents(true);
            const params = new URLSearchParams({ search: query, limit: "10" });
            const { payload } = await request<Student[]>(`/api/students?${params.toString()}`);
            setStudents(payload.success ? payload.data || [] : []);
        } catch (error) {
            console.error("Error searching students:", error);
            setStudents([]);
        } finally {
            setSearchingStudents(false);
        }
    }, []);

    const loadStudentProfile = useCallback(async (studentId: number) => {
        const { payload } = await request<StudentProfileData>(`/api/students/${studentId}/profile`);
        if (payload.success && payload.data) {
            setStudentProfile(payload.data);
            setProfileError(null);
            return payload.data;
        }

        setStudentProfile(null);
        setProfileError(payload.error ?? "No se pudo cargar la ficha del alumno.");
        return null;
    }, []);

    const loadAttendanceRecords = useCallback(async (studentId: number) => {
        const { payload } = await request<AttendanceRecord[]>(`/api/prefecture/students/${studentId}/attendance-records`);
        if (payload.success) {
            setAttendanceRecords(payload.data || []);
        } else {
            setAttendanceRecords([]);
        }
    }, []);

    const loadTimeline = useCallback(async (studentId: number) => {
        const { payload } = await request<{ timeline: PrefectureTimelineEvent[] }>(`/api/prefecture/students/${studentId}/timeline`);
        if (payload.success && payload.data) {
            setTimeline(payload.data.timeline || []);
        } else {
            setTimeline([]);
        }
    }, []);

    const loadStudentContext = useCallback(async (student: Student) => {
        try {
            setProfileLoading(true);
            setAttendanceLoading(true);
            setTimelineLoading(true);
            setProfileError(null);
            await Promise.all([
                loadStudentProfile(student.id),
                loadAttendanceRecords(student.id),
                loadTimeline(student.id),
            ]);
        } catch (error) {
            console.error("Error loading student context:", error);
            setProfileError("No se pudo cargar la informacion operativa del alumno.");
            setAttendanceRecords([]);
            setTimeline([]);
        } finally {
            setProfileLoading(false);
            setAttendanceLoading(false);
            setTimelineLoading(false);
        }
    }, [loadAttendanceRecords, loadStudentProfile, loadTimeline]);

    const refreshSelectedStudent = async () => {
        if (!selectedStudent) return;
        await loadStudentContext(selectedStudent);
    };

    const primaryGuardianName = studentProfile?.guardians[0]?.name || null;

    const buildConductDescription = () => {
        const parts = [
            `Categoria: ${getConductCategoryLabel(conductForm.category)}`,
            `Severidad: ${getConductSeverityLabel(conductForm.severity)}`,
            `Conducta: ${getConductBehaviorLabel(conductForm.behavior)}`,
        ];

        if (conductForm.description.trim()) {
            parts.push(`Contexto: ${conductForm.description.trim()}`);
        }

        return parts.join("\n");
    };

    const buildConductSummary = () => {
        return `${getConductBehaviorLabel(conductForm.behavior)} (${getConductSeverityLabel(conductForm.severity).toLowerCase()})`;
    };

    const buildJustificationReasonText = () => {
        const parts = [
            `Motivo: ${getJustificationReasonLabel(justifyForm.reason_key)}`,
            `Evidencia: ${getJustificationEvidenceLabel(justifyForm.evidence_key)}`,
        ];

        if (justifyForm.notes.trim()) {
            parts.push(`Observaciones: ${justifyForm.notes.trim()}`);
        }

        return parts.join("\n");
    };

    const buildWhatsappPreview = () => {
        if (!selectedStudent) return "";

        if (activeAction === "conducta") {
            return buildPrefectureWhatsappMessage({
                eventType: "conducta",
                studentName: `${selectedStudent.paterno} ${selectedStudent.materno} ${selectedStudent.name}`.trim(),
                guardianName: primaryGuardianName,
                groupName: selectedStudent.grupo,
                eventDate: conductForm.date,
                summary: buildConductSummary(),
                details: buildConductDescription(),
            });
        }

        if (activeAction === "falta_justificada") {
            return buildPrefectureWhatsappMessage({
                eventType: "falta_justificada",
                studentName: `${selectedStudent.paterno} ${selectedStudent.materno} ${selectedStudent.name}`.trim(),
                guardianName: primaryGuardianName,
                groupName: selectedStudent.grupo,
                eventDate: justifyForm.event_date,
                summary: justifyForm.summary.trim() || "Falta justificada",
                details: buildJustificationReasonText(),
            });
        }

        return "";
    };

    const openAction = (action: PrefectureActionType) => {
        setFeedback(null);
        setActiveAction(action);

        if (action === "conducta") {
            setConductForm({
                report_type: "amonestacion",
                category: "disciplina",
                severity: "leve",
                behavior: "interrumpe_clase",
                description: "",
                date: format(new Date(), "yyyy-MM-dd"),
                prepare_whatsapp: true,
            });
            return;
        }

        if (action === "falta_justificada") {
            const firstAbsent = attendanceRecords.find((record) => record.status === "absent");
            setJustifyForm({
                attendance_id: firstAbsent ? String(firstAbsent.id) : "",
                event_date: format(new Date(), "yyyy-MM-dd"),
                reason_key: "cita_medica",
                evidence_key: "constancia",
                summary: "Falta justificada",
                notes: "",
                prepare_whatsapp: true,
            });
            return;
        }

        setEventForm({
            event_date: format(new Date(), "yyyy-MM-dd"),
            summary: action === "contacto_tutor" ? "Seguimiento con tutor por parte de Prefectura" : "",
            details: "",
        });
    };

    const closeModal = () => {
        setActiveAction(null);
    };

    const handleSelectStudent = (student: Student) => {
        setSelectedStudent(student);
        setSearchQuery("");
        setStudents([]);
    };

    const handleOpenProfile = async (student: Student) => {
        setSelectedStudent(student);
        setProfileOpen(true);
        await loadStudentContext(student);
    };

    const submitConduct = async () => {
        if (!selectedStudent) return;

        const { payload } = await request<{ id: number; prefecture_event_id?: number | null }>("/api/conduct", {
            method: "POST",
            body: JSON.stringify({
                student_id: selectedStudent.id,
                report_type: conductForm.report_type,
                description: buildConductDescription(),
                date: conductForm.date,
            }),
        });

        if (!payload.success) {
            throw new Error(payload.error ?? "No se pudo guardar la incidencia.");
        }

        if (conductForm.prepare_whatsapp && payload.data?.prefecture_event_id) {
            await openWhatsappForEvent(payload.data.prefecture_event_id);
        }
    };

    const openWhatsappForEvent = async (eventId: number) => {
        const { payload } = await request<{
            event_id: number;
            phone: string | null;
            guardian_name: string | null;
            message: string;
        }>(`/api/prefecture/events/${eventId}/whatsapp-preview`, {
            method: "POST",
        });

        if (!payload.success || !payload.data) {
            throw new Error(payload.error ?? "No se pudo preparar el mensaje de WhatsApp.");
        }

        if (!payload.data.phone) {
            throw new Error("El alumno no tiene un telefono de tutor disponible para WhatsApp.");
        }

        const sanitizedPhone = payload.data.phone.replace(/\D/g, "");
        const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(payload.data.message)}`;
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");

        await request(`/api/prefecture/events/${eventId}/mark-whatsapp-opened`, {
            method: "POST",
        });
    };

    const submitGenericEvent = async () => {
        if (!selectedStudent || !activeAction || activeAction === "conducta" || activeAction === "falta_justificada") {
            return;
        }

        const { payload } = await request<{ id: number | null }>("/api/prefecture/events", {
            method: "POST",
            body: JSON.stringify({
                student_id: selectedStudent.id,
                event_type: activeAction,
                event_date: eventForm.event_date,
                summary: eventForm.summary,
                details: eventForm.details || null,
                guardian_id: studentProfile?.guardians[0]?.id ?? null,
            }),
        });

        if (!payload.success || !payload.data) {
            throw new Error(payload.error ?? "No se pudo registrar el evento.");
        }

        if (activeAction === "contacto_tutor" && payload.data.id) {
            await openWhatsappForEvent(payload.data.id);
        }
    };

    const submitJustification = async () => {
        if (!justifyForm.attendance_id) {
            throw new Error("Selecciona una falta para justificar.");
        }

        const { payload } = await request<{ event_id?: number | null }>(`/api/prefecture/attendance/${justifyForm.attendance_id}/justify`, {
            method: "POST",
            body: JSON.stringify({
                reason: buildJustificationReasonText(),
                event_date: justifyForm.event_date,
                summary: justifyForm.summary.trim() || undefined,
                guardian_id: studentProfile?.guardians[0]?.id ?? null,
            }),
        });

        if (!payload.success) {
            throw new Error(payload.error ?? "No se pudo justificar la falta.");
        }

        if (justifyForm.prepare_whatsapp && payload.data?.event_id) {
            await openWhatsappForEvent(payload.data.event_id);
        }
    };

    const handleSubmitAction = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!activeAction) return;

        try {
            setSubmitting(true);

            if (activeAction === "conducta") {
                await submitConduct();
                setFeedback({ type: "success", text: "Incidencia guardada y reflejada en la bitacora." });
            } else if (activeAction === "falta_justificada") {
                await submitJustification();
                setFeedback({ type: "success", text: "Falta justificada correctamente desde Prefectura." });
            } else {
                await submitGenericEvent();
                setFeedback({
                    type: "success",
                    text: activeAction === "contacto_tutor"
                        ? "Seguimiento registrado y WhatsApp preparado."
                        : "Evento de prefectura guardado correctamente.",
                });
            }

            closeModal();
            await Promise.all([loadRecentReports(), refreshSelectedStudent()]);
        } catch (error) {
            console.error("Error submitting prefecture action:", error);
            setFeedback({
                type: "error",
                text: error instanceof Error ? error.message : "No se pudo completar la accion.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const deleteReport = async (id: number) => {
        try {
            const { payload } = await request(`/api/conduct/${id}`, { method: "DELETE" });
            if (!payload.success) {
                throw new Error(payload.error ?? "No se pudo eliminar el reporte.");
            }

            setReports((prev) => prev.filter((report) => report.id !== id));
            setFeedback({ type: "success", text: "Reporte eliminado correctamente." });
        } catch (error) {
            console.error("Error deleting report:", error);
            setFeedback({
                type: "error",
                text: error instanceof Error ? error.message : "No se pudo eliminar el reporte.",
            });
        }
    };

    const getReportTypeBadge = (type: string) => {
        switch (type) {
            case "suspension":
                return <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">Suspension</span>;
            case "amonestacion":
                return <span className="inline-flex rounded-full border border-orange-200 bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800">Amonestacion</span>;
            case "nota":
                return <span className="inline-flex rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">Nota informativa</span>;
            default:
                return <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800">{type}</span>;
        }
    };

    useEffect(() => {
        void loadRecentReports();
    }, [loadRecentReports]);

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery.length < 3) {
            setStudents([]);
            setSearchingStudents(false);
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void searchStudents(trimmedQuery);
        }, 250);

        return () => window.clearTimeout(timeoutId);
    }, [searchQuery, searchStudents]);

    useEffect(() => {
        if (!selectedStudent) {
            setStudentProfile(null);
            setAttendanceRecords([]);
            setTimeline([]);
            return;
        }

        void loadStudentContext(selectedStudent);
    }, [selectedStudent, loadStudentContext]);

    const absencesToJustify = attendanceRecords.filter((record) => record.status === "absent");

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#eef6ff_100%)] shadow-sm">
                <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-brand-700">Prefectura integral</p>
                        <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-950">
                            <ShieldAlert className="h-8 w-8 text-brand-600" />
                            Consola operativa de Prefectura
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                            Busca al alumno, captura acciones operativas y deja trazabilidad lista para seguimiento con tutor.
                        </p>

                        <div className="mt-6 max-w-2xl">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Buscar alumno
                            </label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Nombre, matricula o grupo"
                                    className="w-full rounded-2xl border border-slate-200 bg-white/90 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                                />
                            </div>
                            <div className="mt-2 min-h-6 text-xs text-slate-500">
                                {searchingStudents ? "Buscando alumnos..." : "Escribe al menos 3 caracteres para activar la busqueda."}
                            </div>
                            {students.length > 0 && (
                                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                                    {students.map((student) => (
                                        <button
                                            key={student.id}
                                            type="button"
                                            onClick={() => handleSelectStudent(student)}
                                            className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 last:border-b-0"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">
                                                    {student.paterno} {student.materno} {student.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {student.no_control} - Grupo {student.grupo || "Sin grupo"}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                                                Seleccionar
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Alumno activo</p>
                        {selectedStudent ? (
                            <div className="mt-4 space-y-4">
                                <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-2xl bg-white p-3 text-brand-600 shadow-sm">
                                            <UserCircle className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-lg font-semibold text-slate-900">
                                                {selectedStudent.paterno} {selectedStudent.materno} {selectedStudent.name}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-600">
                                                {selectedStudent.no_control} - Grupo {selectedStudent.grupo || "Sin grupo"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Tutor principal</p>
                                        <p className="mt-2 text-sm font-medium text-slate-900">
                                            {studentProfile?.guardians[0]?.name || "Sin tutor"}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Telefono</p>
                                        <p className="mt-2 text-sm font-medium text-slate-900">
                                            {studentProfile?.guardians[0]?.phone || "Sin telefono"}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">Faltas pendientes</p>
                                        <p className="mt-2 text-sm font-medium text-slate-900">{absencesToJustify.length}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setProfileOpen(true)}
                                        className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Abrir ficha lateral
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Limpiar seleccion
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                                La consola prioriza un alumno a la vez. Selecciona uno para habilitar acciones rapidas, ficha y justificacion de faltas.
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {feedback && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${
                    feedback.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-700"
                }`}>
                    {feedback.text}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.08fr_1fr]">
                <div className="space-y-6">
                    <StudentProfileCard
                        profile={studentProfile}
                        loading={profileLoading}
                        error={profileError}
                    />

                    <PrefectureQuickActions
                        disabled={!selectedStudent}
                        onSelect={openAction}
                    />

                    <section className="card">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <UserSquare2 className="h-4 w-4 text-brand-600" />
                            Asistencias recientes del alumno
                        </div>
                        <div className="mt-4 space-y-3">
                            {attendanceLoading ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                    Cargando asistencias...
                                </div>
                            ) : attendanceRecords.length === 0 ? (
                                <p className="text-sm text-slate-500">Selecciona un alumno para revisar sus faltas y registros recientes.</p>
                            ) : (
                                attendanceRecords.slice(0, 6).map((record) => (
                                    <div key={record.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{record.subject_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {record.group_name} - Modulo {record.period_num}
                                                </p>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                record.status === "absent"
                                                    ? "bg-red-100 text-red-700"
                                                    : record.status === "justified"
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : record.status === "late"
                                                            ? "bg-amber-100 text-amber-700"
                                                            : "bg-slate-200 text-slate-700"
                                            }`}>
                                                {record.status === "absent"
                                                    ? "Falta"
                                                    : record.status === "justified"
                                                        ? "Justificada"
                                                        : record.status === "late"
                                                            ? "Retardo"
                                                            : "Asistencia"}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-slate-500">{format(parseISO(record.date), "dd/MM/yyyy")}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <PrefectureTimeline
                        events={timeline}
                        loading={timelineLoading}
                        emptyMessage="Selecciona un alumno para visualizar su bitacora integral de Prefectura."
                    />
                </div>

                <section className="card overflow-hidden !p-0">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actividad reciente</p>
                            <h2 className="mt-1 text-lg font-semibold text-slate-900">Reportes disciplinarios</h2>
                        </div>
                        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                            {reports.length} registros
                        </span>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center gap-3 p-12 text-sm text-slate-500">
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                            Cargando reportes...
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                                <ShieldAlert className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="mt-4 text-lg font-medium text-slate-900">No hay reportes recientes</h3>
                            <p className="mt-1 text-sm">Usa las acciones rapidas para comenzar la bitacora operativa.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3">Fecha</th>
                                        <th className="px-5 py-3">Alumno</th>
                                        <th className="px-5 py-3">Tipo</th>
                                        <th className="px-5 py-3">Descripcion</th>
                                        <th className="px-5 py-3">Responsable</th>
                                        <th className="px-5 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reports.map((report) => {
                                        const reportStudent: Student = {
                                            id: report.student_id,
                                            no_control: report.no_control || "",
                                            name: report.student_name || "",
                                            paterno: report.paterno || "",
                                            materno: report.materno || "",
                                            grupo: report.grupo || "",
                                        };

                                        return (
                                            <tr key={report.id} className="align-top transition hover:bg-slate-50/70">
                                                <td className="px-5 py-4 font-medium text-slate-900">
                                                    {format(parseISO(report.date), "dd/MM/yyyy")}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <p className="font-medium text-slate-900">
                                                        {report.paterno} {report.materno} {report.student_name}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {report.no_control} - Grupo {report.grupo}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4">{getReportTypeBadge(report.report_type)}</td>
                                                <td className="max-w-xs px-5 py-4 text-slate-600" title={report.description}>
                                                    {report.description}
                                                </td>
                                                <td className="px-5 py-4 text-xs text-slate-500">
                                                    {report.reported_by_name || "Sistema"}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectStudent(reportStudent)}
                                                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-white"
                                                        >
                                                            Usar alumno
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleOpenProfile(reportStudent)}
                                                            className="rounded-lg p-2 text-brand-600 transition hover:bg-brand-50"
                                                            title="Ver ficha del alumno"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => void deleteReport(report.id)}
                                                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                                                            title="Eliminar reporte"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {activeAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
                        <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Accion rapida</p>
                                    <h2 className="mt-1 text-xl font-semibold text-slate-900">{actionTitles[activeAction]}</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {selectedStudent
                                            ? `${selectedStudent.paterno} ${selectedStudent.materno} ${selectedStudent.name}`
                                            : "Selecciona un alumno antes de continuar."}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmitAction} className="overflow-y-auto px-6 py-6">
                            {activeAction === "conducta" && (
                                <div className="space-y-5">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de reporte</label>
                                            <select
                                                value={conductForm.report_type}
                                                onChange={(e) => setConductForm((prev) => ({ ...prev, report_type: e.target.value as "amonestacion" | "suspension" | "nota" }))}
                                                className="input-field"
                                            >
                                                <option value="amonestacion">Amonestacion verbal o escrita</option>
                                                <option value="suspension">Suspension</option>
                                                <option value="nota">Nota informativa</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha</label>
                                            <input
                                                type="date"
                                                value={conductForm.date}
                                                onChange={(e) => setConductForm((prev) => ({ ...prev, date: e.target.value }))}
                                                className="input-field"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">Categoria</label>
                                        <div className="flex flex-wrap gap-2">
                                            {conductCategoryCatalog.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setConductForm((prev) => ({ ...prev, category: item.id }))}
                                                    className={`rounded-full px-3 py-2 text-sm transition ${
                                                        conductForm.category === item.id
                                                            ? "bg-slate-900 text-white"
                                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                    }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">Severidad</label>
                                            <div className="flex flex-wrap gap-2">
                                                {conductSeverityCatalog.map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => setConductForm((prev) => ({ ...prev, severity: item.id }))}
                                                        className={`rounded-full px-3 py-2 text-sm transition ${
                                                            conductForm.severity === item.id
                                                                ? "bg-red-600 text-white"
                                                                : "bg-red-50 text-red-700 hover:bg-red-100"
                                                        }`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">Conducta observada</label>
                                            <div className="flex flex-wrap gap-2">
                                                {conductBehaviorCatalog.map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => setConductForm((prev) => ({ ...prev, behavior: item.id }))}
                                                        className={`rounded-2xl px-3 py-2 text-sm transition ${
                                                            conductForm.behavior === item.id
                                                                ? "bg-brand-600 text-white"
                                                                : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                                                        }`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Contexto adicional</label>
                                        <textarea
                                            value={conductForm.description}
                                            onChange={(e) => setConductForm((prev) => ({ ...prev, description: e.target.value }))}
                                            className="input-field min-h-32 resize-none"
                                            placeholder="Agrega detalles puntuales, reaccion del alumno o acuerdos tomados."
                                        />
                                    </div>
                                    <label className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                        <input
                                            type="checkbox"
                                            checked={conductForm.prepare_whatsapp}
                                            onChange={(e) => setConductForm((prev) => ({ ...prev, prepare_whatsapp: e.target.checked }))}
                                            className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        Preparar mensaje de WhatsApp para el tutor al guardar
                                    </label>
                                </div>
                            )}

                            {activeAction === "falta_justificada" && (
                                <div className="space-y-5">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Falta a justificar</label>
                                        <select
                                            value={justifyForm.attendance_id}
                                            onChange={(e) => setJustifyForm((prev) => ({ ...prev, attendance_id: e.target.value }))}
                                            className="input-field"
                                            required
                                        >
                                            <option value="">Selecciona una falta</option>
                                            {absencesToJustify.map((record) => (
                                                <option key={record.id} value={record.id}>
                                                    {format(parseISO(record.date), "dd/MM/yyyy")} - {record.subject_name} - Modulo {record.period_num}
                                                </option>
                                            ))}
                                        </select>
                                        {absencesToJustify.length === 0 && (
                                            <p className="mt-2 text-xs text-amber-700">
                                                No hay faltas recientes pendientes. Si ya fue justificada, aparecera como asistencia valida.
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha de justificacion</label>
                                            <input
                                                type="date"
                                                value={justifyForm.event_date}
                                                onChange={(e) => setJustifyForm((prev) => ({ ...prev, event_date: e.target.value }))}
                                                className="input-field"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Resumen visible</label>
                                            <input
                                                type="text"
                                                value={justifyForm.summary}
                                                onChange={(e) => setJustifyForm((prev) => ({ ...prev, summary: e.target.value }))}
                                                className="input-field"
                                                placeholder="Opcional"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">Motivo de la justificacion</label>
                                        <div className="flex flex-wrap gap-2">
                                            {justificationReasonCatalog.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setJustifyForm((prev) => ({ ...prev, reason_key: item.id }))}
                                                    className={`rounded-full px-3 py-2 text-sm transition ${
                                                        justifyForm.reason_key === item.id
                                                            ? "bg-emerald-600 text-white"
                                                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                    }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">Soporte recibido</label>
                                        <div className="flex flex-wrap gap-2">
                                            {justificationEvidenceCatalog.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setJustifyForm((prev) => ({ ...prev, evidence_key: item.id }))}
                                                    className={`rounded-full px-3 py-2 text-sm transition ${
                                                        justifyForm.evidence_key === item.id
                                                            ? "bg-sky-600 text-white"
                                                            : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                                                    }`}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Observaciones</label>
                                        <textarea
                                            value={justifyForm.notes}
                                            onChange={(e) => setJustifyForm((prev) => ({ ...prev, notes: e.target.value }))}
                                            className="input-field min-h-28 resize-none"
                                            placeholder="Anota detalles adicionales o aclaraciones de la familia."
                                        />
                                    </div>
                                    <label className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                                        <input
                                            type="checkbox"
                                            checked={justifyForm.prepare_whatsapp}
                                            onChange={(e) => setJustifyForm((prev) => ({ ...prev, prepare_whatsapp: e.target.checked }))}
                                            className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        Preparar mensaje de WhatsApp para el tutor al guardar
                                    </label>
                                </div>
                            )}

                            {activeAction !== "conducta" && activeAction !== "falta_justificada" && (
                                <div className="space-y-5">
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                                        El evento se registrara como <strong className="font-semibold text-slate-900">{getPrefectureEventLabel(activeAction)}</strong> y quedara disponible en la bitacora del alumno.
                                        {activeAction === "contacto_tutor" && " Ademas se preparara el mensaje sugerido para WhatsApp."}
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha del evento</label>
                                            <input
                                                type="date"
                                                value={eventForm.event_date}
                                                onChange={(e) => setEventForm((prev) => ({ ...prev, event_date: e.target.value }))}
                                                className="input-field"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-slate-700">Resumen</label>
                                            <input
                                                type="text"
                                                value={eventForm.summary}
                                                onChange={(e) => setEventForm((prev) => ({ ...prev, summary: e.target.value }))}
                                                className="input-field"
                                                placeholder="Resumen breve para la bitacora"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">Detalle</label>
                                        <textarea
                                            value={eventForm.details}
                                            onChange={(e) => setEventForm((prev) => ({ ...prev, details: e.target.value }))}
                                            className="input-field min-h-32 resize-none"
                                            placeholder="Agrega contexto util para seguimiento."
                                        />
                                    </div>
                                </div>
                            )}

                            {(activeAction === "conducta" || activeAction === "falta_justificada") && (
                                <div className="mt-6 rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ecfeff_100%)] p-4">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        Vista previa del mensaje para WhatsApp
                                    </div>
                                    <p className="mt-3 whitespace-pre-line rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700 shadow-sm">
                                        {buildWhatsappPreview()}
                                    </p>
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
                                <button type="button" onClick={closeModal} className="btn-secondary">
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !selectedStudent}
                                    className="btn-primary inline-flex items-center"
                                >
                                    {submitting ? (
                                        <>
                                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                            Guardando
                                        </>
                                    ) : (
                                        activeAction === "contacto_tutor" ? "Guardar y abrir WhatsApp" : "Guardar accion"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {profileOpen && (
                <div className="fixed inset-0 z-40 flex justify-end bg-black/30 backdrop-blur-sm">
                    <div className="h-full w-full max-w-xl overflow-y-auto border-l border-gray-200 bg-gray-50 shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Perfil rapido del alumno</h2>
                                <p className="text-sm text-gray-500">Consulta sin salir del flujo de prefectura</p>
                            </div>
                            <button
                                onClick={() => setProfileOpen(false)}
                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 p-5">
                            <StudentProfileCard
                                profile={studentProfile}
                                loading={profileLoading}
                                error={profileError}
                            />

                            {studentProfile && (
                                <>
                                    <section className="card">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                            <Phone className="h-4 w-4 text-brand-600" />
                                            Contacto y tutor principal
                                        </h3>
                                        <div className="mt-4 space-y-3 text-sm text-gray-700">
                                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Tutor</p>
                                                <p className="mt-2 font-medium text-gray-900">{studentProfile.guardians[0]?.name || "Sin tutor registrado"}</p>
                                                <p className="mt-1">{studentProfile.guardians[0]?.relationship || "Sin parentesco registrado"}</p>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Telefono</p>
                                                <p className="mt-2 font-medium text-gray-900">{studentProfile.guardians[0]?.phone || "Sin telefono principal"}</p>
                                                <p className="mt-1">{studentProfile.guardians[0]?.email || "Sin correo del tutor"}</p>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="card">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                            <FileText className="h-4 w-4 text-brand-600" />
                                            Documentos principales
                                        </h3>
                                        <div className="mt-4 space-y-2">
                                            {studentProfile.documents.length === 0 ? (
                                                <p className="text-sm text-gray-500">No hay documentos cargados.</p>
                                            ) : (
                                                studentProfile.documents.slice(0, 5).map((document) => (
                                                    <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 text-sm">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-gray-900">{document.file_name}</p>
                                                            <p className="truncate text-xs text-gray-500">
                                                                {documentTypeLabels[document.document_type] ?? document.document_type}
                                                            </p>
                                                        </div>
                                                        {document.is_primary && (
                                                            <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-medium text-brand-700">
                                                                Principal
                                                            </span>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </section>

                                    <section className="card">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                            <AlertTriangle className="h-4 w-4 text-brand-600" />
                                            Incidencias recientes
                                        </h3>
                                        <div className="mt-4 space-y-2">
                                            {studentProfile.recent_incidents.length === 0 ? (
                                                <p className="text-sm text-gray-500">Sin incidencias recientes.</p>
                                            ) : (
                                                studentProfile.recent_incidents.map((incident) => (
                                                    <div key={incident.id} className="rounded-xl border border-gray-100 p-3">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {incidentTypeLabels[incident.report_type ?? incident.type ?? "nota"] ?? "Nota"}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{format(parseISO(incident.date), "dd/MM/yyyy")}</p>
                                                        </div>
                                                        <p className="mt-2 text-sm text-gray-700">{incident.description}</p>
                                                        <p className="mt-1 text-xs text-gray-500">{incident.reported_by_name || "Sistema"}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
