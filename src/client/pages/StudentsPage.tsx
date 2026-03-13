import { useCallback, useEffect, useState } from "react";
import {
    ChevronDown,
    Download,
    Edit3,
    Eye,
    FileText,
    Filter,
    Phone,
    Plus,
    Search,
    Trash2,
    Upload,
    Users,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { StudentProfileCard } from "../components/students/StudentProfileCard";
import { StudentProfileChecklist } from "../components/students/StudentProfileChecklist";
import { StudentProfileSections } from "../components/students/StudentProfileSections";
import type { StudentDocument, StudentGuardian, StudentListItem, StudentProfileData } from "../components/students/types";

type StudentForm = Omit<StudentListItem, "id" | "primary_phone" | "guardian_name" | "photo_url">;
type DetailTab = "resumen" | "datos" | "tutores" | "expediente";
type PanelMode = "idle" | "create" | "view";

const emptyStudentForm: StudentForm = {
    no_control: "",
    curp: "",
    name: "",
    paterno: "",
    materno: "",
    career: "",
    generation: "",
    semester: 0,
    grupo: "",
    blood_type: null,
    nss: null,
};

const emptyGuardianForm = {
    name: "",
    relationship: "",
    phone: "",
    phone_alt: "",
    email: "",
};

const docTypeLabels: Record<string, string> = {
    acta_nacimiento: "Acta de nacimiento",
    curp: "CURP",
    certificado_secundaria: "Certificado de secundaria",
    comprobante_domicilio: "Comprobante de domicilio",
    photo: "Fotografia",
    other: "Otro",
};

export function StudentsPage() {
    const [students, setStudents] = useState<StudentListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterGrupo, setFilterGrupo] = useState("");
    const [filterCareer, setFilterCareer] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [panelMode, setPanelMode] = useState<PanelMode>("idle");
    const [activeTab, setActiveTab] = useState<DetailTab>("resumen");
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [profile, setProfile] = useState<StudentProfileData | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [form, setForm] = useState<StudentForm>(emptyStudentForm);
    const [savingStudent, setSavingStudent] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [guardianForm, setGuardianForm] = useState(emptyGuardianForm);
    const [editingGuardianId, setEditingGuardianId] = useState<number | null>(null);
    const [guardianSaving, setGuardianSaving] = useState(false);
    const [docType, setDocType] = useState("acta_nacimiento");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadingDocument, setUploadingDocument] = useState(false);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (filterGrupo) params.set("grupo", filterGrupo);
        if (filterCareer) params.set("career", filterCareer);

        const query = params.toString();
        const response = await api.get<StudentListItem[]>(`/students${query ? `?${query}` : ""}`);
        if (response.success && response.data) setStudents(response.data);
        setLoading(false);
    }, [filterCareer, filterGrupo, search]);

    const syncFormFromStudent = useCallback((student: StudentListItem) => {
        setForm({
            no_control: student.no_control,
            curp: student.curp,
            name: student.name,
            paterno: student.paterno,
            materno: student.materno,
            career: student.career,
            generation: student.generation,
            semester: student.semester,
            grupo: student.grupo,
            blood_type: student.blood_type,
            nss: student.nss,
        });
    }, []);

    const loadProfile = useCallback(async (studentId: number) => {
        setProfileLoading(true);
        setProfileError(null);
        const response = await api.get<StudentProfileData>(`/students/${studentId}/profile`);
        if (response.success && response.data) {
            setProfile(response.data);
            syncFormFromStudent(response.data.student);
        } else {
            setProfile(null);
            setProfileError(response.error ?? "No se pudo cargar la ficha del alumno.");
        }
        setProfileLoading(false);
    }, [syncFormFromStudent]);

    useEffect(() => {
        void fetchStudents();
    }, [fetchStudents]);

    useEffect(() => {
        if (panelMode === "view" && selectedStudentId) {
            void loadProfile(selectedStudentId);
        }
    }, [loadProfile, panelMode, selectedStudentId]);

    const grupos = [...new Set(students.map((student) => student.grupo))].filter(Boolean).sort();
    const careers = [...new Set(students.map((student) => student.career))].filter(Boolean).sort();

    const openCreate = () => {
        setPanelMode("create");
        setSelectedStudentId(null);
        setProfile(null);
        setProfileError(null);
        setActiveTab("datos");
        setForm(emptyStudentForm);
        setGuardianForm(emptyGuardianForm);
        setEditingGuardianId(null);
        setSelectedFile(null);
        setFeedback(null);
    };

    const openProfile = (student: StudentListItem, tab: DetailTab = "resumen") => {
        setPanelMode("view");
        setSelectedStudentId(student.id);
        setActiveTab(tab);
        setProfile((current) => (current?.student.id === student.id ? current : null));
        setFeedback(null);
        syncFormFromStudent(student);
    };

    const resetGuardianForm = () => {
        setEditingGuardianId(null);
        setGuardianForm(emptyGuardianForm);
    };

    const startGuardianEdit = (guardian: StudentGuardian) => {
        setEditingGuardianId(guardian.id);
        setGuardianForm({
            name: guardian.name,
            relationship: guardian.relationship,
            phone: guardian.phone,
            phone_alt: guardian.phone_alt ?? "",
            email: guardian.email ?? "",
        });
    };

    const handleSaveStudent = async () => {
        setSavingStudent(true);
        setFeedback(null);

        let createdId: number | undefined;
        const response = panelMode === "create"
            ? await api.post<{ id: number }>("/students", form)
            : await api.put(`/students/${selectedStudentId}`, form);

        if (!response.success) {
            setFeedback({ type: "error", text: response.error ?? "No se pudo guardar el alumno." });
            setSavingStudent(false);
            return;
        }

        if (panelMode === "create") {
            createdId = (response.data as { id?: number } | undefined)?.id;
        }

        await fetchStudents();

        if (panelMode === "create") {
            if (createdId) {
                setPanelMode("view");
                setSelectedStudentId(createdId);
                setActiveTab("resumen");
                await loadProfile(createdId);
            }
            setFeedback({ type: "success", text: "Alumno creado correctamente." });
        } else if (selectedStudentId) {
            await loadProfile(selectedStudentId);
            setFeedback({ type: "success", text: "Alumno actualizado correctamente." });
        }

        setSavingStudent(false);
    };

    const handleGuardianSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedStudentId) return;

        setGuardianSaving(true);
        setFeedback(null);

        const payload = {
            ...guardianForm,
            phone_alt: guardianForm.phone_alt || undefined,
            email: guardianForm.email || undefined,
        };

        const response = editingGuardianId
            ? await api.put(`/students/${selectedStudentId}/guardians/${editingGuardianId}`, payload)
            : await api.post(`/students/${selectedStudentId}/guardians`, payload);

        if (!response.success) {
            setFeedback({ type: "error", text: response.error ?? "No se pudo guardar el tutor." });
            setGuardianSaving(false);
            return;
        }

        await loadProfile(selectedStudentId);
        setGuardianSaving(false);
        resetGuardianForm();
        setFeedback({ type: "success", text: editingGuardianId ? "Tutor actualizado correctamente." : "Tutor agregado correctamente." });
    };

    const handleDeleteGuardian = async (guardianId: number) => {
        if (!selectedStudentId) return;

        const response = await api.delete(`/students/${selectedStudentId}/guardians/${guardianId}`);
        if (!response.success) {
            setFeedback({ type: "error", text: response.error ?? "No se pudo eliminar el tutor." });
            return;
        }

        await loadProfile(selectedStudentId);
        if (editingGuardianId === guardianId) resetGuardianForm();
        setFeedback({ type: "success", text: "Tutor eliminado correctamente." });
    };

    const handleDocumentUpload = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedStudentId || !selectedFile) return;

        setUploadingDocument(true);
        setFeedback(null);

        try {
            const token = useAuthStore.getState().token;
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("student_id", String(selectedStudentId));
            formData.append("document_type", docType);

            const response = await fetch("/api/documents/upload", {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });
            const data = await response.json() as { success: boolean; error?: string };

            if (!data.success) {
                setFeedback({ type: "error", text: data.error ?? "No se pudo subir el documento." });
                setUploadingDocument(false);
                return;
            }

            setSelectedFile(null);
            await Promise.all([fetchStudents(), loadProfile(selectedStudentId)]);
            setFeedback({ type: "success", text: "Documento cargado correctamente." });
        } catch {
            setFeedback({ type: "error", text: "No se pudo subir el documento." });
        } finally {
            setUploadingDocument(false);
        }
    };

    const handleDeleteDocument = async (documentId: number) => {
        if (!selectedStudentId) return;

        const response = await api.delete(`/documents/${documentId}`);
        if (!response.success) {
            setFeedback({ type: "error", text: response.error ?? "No se pudo eliminar el documento." });
            return;
        }

        await Promise.all([fetchStudents(), loadProfile(selectedStudentId)]);
        setFeedback({ type: "success", text: "Documento eliminado correctamente." });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                        <Users className="h-7 w-7 text-brand-500" />
                        Alumnos
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">{students.length} registrados</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo alumno
                </button>
            </div>

            <div className="card !p-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, CURP o No. Control..."
                            className="input-field pl-9 text-sm"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters((value) => !value)}
                        className={`btn-secondary flex items-center gap-1 text-sm ${showFilters ? "bg-brand-50 border-brand-300" : ""}`}
                    >
                        <Filter className="h-4 w-4" />
                        Filtros
                        <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row">
                        <select className="input-field text-sm sm:w-40" value={filterGrupo} onChange={(event) => setFilterGrupo(event.target.value)}>
                            <option value="">Todos los grupos</option>
                            {grupos.map((grupo) => <option key={grupo} value={grupo}>{grupo}</option>)}
                        </select>
                        <select className="input-field text-sm sm:w-56" value={filterCareer} onChange={(event) => setFilterCareer(event.target.value)}>
                            <option value="">Todas las carreras</option>
                            {careers.map((career) => <option key={career} value={career}>{career}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
                <div className="card !p-0 overflow-hidden">
                    <StudentsTable
                        students={students}
                        loading={loading}
                        selectedStudentId={selectedStudentId}
                        onView={openProfile}
                    />
                </div>
                <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                    {feedback && <FeedbackBanner type={feedback.type} text={feedback.text} />}
                    {panelMode === "idle" && <EmptyPanel />}
                    {panelMode === "create" && (
                        <div className="space-y-4">
                            <div className="card">
                                <h2 className="text-lg font-semibold text-gray-900">Alta de alumno</h2>
                                <p className="mt-1 text-sm text-gray-500">Captura la informacion basica para iniciar el expediente integral.</p>
                            </div>
                            <StudentFormCard form={form} onChange={setForm} saving={savingStudent} onSave={() => void handleSaveStudent()} />
                        </div>
                    )}
                    {panelMode === "view" && (
                        <>
                            <StudentProfileCard profile={profile} loading={profileLoading} error={profileError} />
                            <Tabs activeTab={activeTab} onChange={setActiveTab} />
                            {profile && activeTab === "resumen" && <StudentProfileSections profile={profile} />}
                            {activeTab === "datos" && (
                                <StudentFormCard form={form} onChange={setForm} saving={savingStudent} onSave={() => void handleSaveStudent()} />
                            )}
                            {profile && activeTab === "tutores" && (
                                <GuardiansPanel
                                    guardians={profile.guardians}
                                    form={guardianForm}
                                    editingGuardianId={editingGuardianId}
                                    saving={guardianSaving}
                                    onFormChange={setGuardianForm}
                                    onEdit={startGuardianEdit}
                                    onDelete={(guardianId) => void handleDeleteGuardian(guardianId)}
                                    onReset={resetGuardianForm}
                                    onSubmit={(event) => void handleGuardianSubmit(event)}
                                />
                            )}
                            {profile && activeTab === "expediente" && (
                                <DocumentsPanel
                                    checklist={profile.document_checklist}
                                    documents={profile.documents}
                                    docType={docType}
                                    file={selectedFile}
                                    uploading={uploadingDocument}
                                    onDocTypeChange={setDocType}
                                    onFileChange={setSelectedFile}
                                    onUpload={(event) => void handleDocumentUpload(event)}
                                    onDelete={(documentId) => void handleDeleteDocument(documentId)}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function StudentsTable({
    students,
    loading,
    selectedStudentId,
    onView,
}: {
    students: StudentListItem[];
    loading: boolean;
    selectedStudentId: number | null;
    onView: (student: StudentListItem, tab?: DetailTab) => void;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">No. Control</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Grupo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Carrera</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan={5} className="py-12 text-center text-gray-400">Cargando alumnos...</td></tr>
                    ) : students.length === 0 ? (
                        <tr><td colSpan={5} className="py-12 text-center text-gray-400">No hay alumnos para mostrar.</td></tr>
                    ) : (
                        students.map((student) => (
                            <tr key={student.id} className={`transition-colors hover:bg-gray-50/70 ${selectedStudentId === student.id ? "bg-brand-50/50" : ""}`}>
                                <td className="px-4 py-3 text-sm font-mono text-brand-700">{student.no_control}</td>
                                <td className="px-4 py-3">
                                    <div className="text-sm font-medium text-gray-900">{[student.paterno, student.materno, student.name].filter(Boolean).join(" ")}</div>
                                    <div className="mt-0.5 text-xs text-gray-500">{student.curp || "Sin CURP"}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">{student.grupo || "Sin grupo"}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{student.career || "Sin carrera"}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        {student.primary_phone && (
                                            <a href={`tel:${student.primary_phone}`} className="rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700" title="Llamar al tutor">
                                                <Phone className="h-4 w-4" />
                                            </a>
                                        )}
                                        <button onClick={() => onView(student, "resumen")} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600" title="Ver ficha">
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => onView(student, "datos")} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600" title="Editar alumno">
                                            <Edit3 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function Tabs({ activeTab, onChange }: { activeTab: DetailTab; onChange: (tab: DetailTab) => void }) {
    return (
        <div className="card !p-2">
            <div className="grid grid-cols-4 gap-2">
                {([
                    ["resumen", "Resumen"],
                    ["datos", "Datos"],
                    ["tutores", "Tutores"],
                    ["expediente", "Expediente"],
                ] as Array<[DetailTab, string]>).map(([value, label]) => (
                    <button
                        key={value}
                        onClick={() => onChange(value)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${activeTab === value ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function EmptyPanel() {
    return <div className="card text-sm text-gray-500">Selecciona un alumno de la lista o crea uno nuevo para abrir la ficha 360.</div>;
}

function FeedbackBanner({ type, text }: { type: "success" | "error"; text: string }) {
    return (
        <div className={`rounded-xl border px-4 py-3 text-sm ${type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {text}
        </div>
    );
}

function StudentFormCard({
    form,
    onChange,
    saving,
    onSave,
}: {
    form: StudentForm;
    onChange: (form: StudentForm) => void;
    saving: boolean;
    onSave: () => void;
}) {
    return (
        <div className="card">
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="No. Control" value={form.no_control} onChange={(value) => onChange({ ...form, no_control: value })} required />
                <Field label="CURP" value={form.curp} onChange={(value) => onChange({ ...form, curp: value })} />
                <Field label="Nombre(s)" value={form.name} onChange={(value) => onChange({ ...form, name: value })} required />
                <Field label="Apellido paterno" value={form.paterno} onChange={(value) => onChange({ ...form, paterno: value })} required />
                <Field label="Apellido materno" value={form.materno} onChange={(value) => onChange({ ...form, materno: value })} />
                <Field label="Grupo" value={form.grupo} onChange={(value) => onChange({ ...form, grupo: value })} />
                <Field label="Semestre" value={String(form.semester)} onChange={(value) => onChange({ ...form, semester: Number(value) || 0 })} type="number" />
                <Field label="Generacion" value={form.generation} onChange={(value) => onChange({ ...form, generation: value })} />
                <div className="sm:col-span-2">
                    <Field label="Carrera" value={form.career} onChange={(value) => onChange({ ...form, career: value })} />
                </div>
                <Field label="Tipo de sangre" value={form.blood_type ?? ""} onChange={(value) => onChange({ ...form, blood_type: value || null })} />
                <Field label="NSS" value={form.nss ?? ""} onChange={(value) => onChange({ ...form, nss: value || null })} />
            </div>
            <div className="mt-5 flex justify-end">
                <button onClick={onSave} disabled={saving} className="btn-primary">
                    {saving ? "Guardando..." : "Guardar cambios"}
                </button>
            </div>
        </div>
    );
}

function GuardiansPanel({
    guardians,
    form,
    editingGuardianId,
    saving,
    onFormChange,
    onEdit,
    onDelete,
    onReset,
    onSubmit,
}: {
    guardians: StudentGuardian[];
    form: typeof emptyGuardianForm;
    editingGuardianId: number | null;
    saving: boolean;
    onFormChange: (form: typeof emptyGuardianForm) => void;
    onEdit: (guardian: StudentGuardian) => void;
    onDelete: (guardianId: number) => void;
    onReset: () => void;
    onSubmit: (event: React.FormEvent) => void;
}) {
    return (
        <div className="space-y-4">
            <div className="card">
                <h3 className="text-sm font-semibold text-gray-900">Tutores registrados</h3>
                <div className="mt-4 space-y-3">
                    {guardians.length === 0 ? (
                        <p className="text-sm text-gray-500">No hay tutores registrados.</p>
                    ) : (
                        guardians.map((guardian) => (
                            <div key={guardian.id} className="rounded-xl border border-gray-100 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{guardian.name}</p>
                                        <p className="text-xs text-gray-500">{guardian.relationship}</p>
                                        <p className="mt-2 text-xs text-gray-500">{guardian.phone}</p>
                                        <p className="text-xs text-gray-500">{guardian.email || "Sin correo"}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => onEdit(guardian)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-brand-50 hover:text-brand-600" title="Editar tutor">
                                            <Edit3 className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => onDelete(guardian.id)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Eliminar tutor">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="card">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-900">{editingGuardianId ? "Editar tutor" : "Agregar tutor"}</h3>
                    {editingGuardianId && (
                        <button onClick={onReset} className="text-sm text-gray-500 hover:text-gray-700">
                            Cancelar edicion
                        </button>
                    )}
                </div>
                <form onSubmit={onSubmit} className="mt-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Nombre" value={form.name} onChange={(value) => onFormChange({ ...form, name: value })} required />
                        <Field label="Relacion" value={form.relationship} onChange={(value) => onFormChange({ ...form, relationship: value })} required />
                        <Field label="Telefono" value={form.phone} onChange={(value) => onFormChange({ ...form, phone: value })} required />
                        <Field label="Telefono alterno" value={form.phone_alt} onChange={(value) => onFormChange({ ...form, phone_alt: value })} />
                        <div className="sm:col-span-2">
                            <Field label="Correo" value={form.email} onChange={(value) => onFormChange({ ...form, email: value })} type="email" />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? "Guardando..." : editingGuardianId ? "Actualizar tutor" : "Agregar tutor"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DocumentsPanel({
    checklist,
    documents,
    docType,
    file,
    uploading,
    onDocTypeChange,
    onFileChange,
    onUpload,
    onDelete,
}: {
    checklist: StudentProfileData["document_checklist"];
    documents: StudentDocument[];
    docType: string;
    file: File | null;
    uploading: boolean;
    onDocTypeChange: (value: string) => void;
    onFileChange: (file: File | null) => void;
    onUpload: (event: React.FormEvent) => void;
    onDelete: (documentId: number) => void;
}) {
    return (
        <div className="space-y-4">
            <div className="card">
                <h3 className="text-sm font-semibold text-gray-900">Checklist documental</h3>
                <div className="mt-4">
                    <StudentProfileChecklist items={checklist} />
                </div>
            </div>

            <div className="card">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Upload className="h-4 w-4 text-brand-600" />
                    Cargar documento
                </h3>
                <form onSubmit={onUpload} className="mt-4 space-y-3">
                    <select value={docType} onChange={(event) => onDocTypeChange(event.target.value)} className="input-field text-sm">
                        {Object.entries(docTypeLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <input
                        type="file"
                        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                        required
                    />
                    <div className="flex justify-end">
                        <button type="submit" disabled={!file || uploading} className="btn-primary">
                            {uploading ? "Subiendo..." : "Subir documento"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="card">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <FileText className="h-4 w-4 text-brand-600" />
                    Documentos del expediente
                </h3>
                <div className="mt-4 space-y-3">
                    {documents.length === 0 ? (
                        <p className="text-sm text-gray-500">No hay documentos cargados.</p>
                    ) : (
                        documents.map((document) => (
                            <div key={document.id} className="rounded-xl border border-gray-100 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-gray-900">{docTypeLabels[document.document_type] ?? document.document_type}</p>
                                        <p className="truncate text-xs text-gray-500">{document.file_name}</p>
                                        {document.is_primary && <p className="mt-1 text-xs font-medium text-brand-700">Foto principal activa</p>}
                                    </div>
                                    <div className="flex gap-1">
                                        <a href={document.download_url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600" title="Abrir documento">
                                            <Download className="h-4 w-4" />
                                        </a>
                                        <button onClick={() => onDelete(document.id)} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600" title="Eliminar documento">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    required,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
            <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="input-field text-sm" />
        </label>
    );
}
