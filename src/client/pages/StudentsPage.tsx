import { useState, useEffect, useCallback } from "react";
import {
    Search,
    Plus,
    Edit3,
    Trash2,
    X,
    Users,
    Filter,
    ChevronDown,
    Phone,
    MessageSquare,
    FileText,
    Upload,
    Download
} from "lucide-react";
import { api } from "../lib/api";

interface Student {
    id: number;
    no_control: string;
    curp: string;
    name: string;
    paterno: string;
    materno: string;
    career: string;
    generation: string;
    semester: number;
    grupo: string;
    blood_type: string | null;
    nss: string | null;
    primary_phone?: string;
    guardian_name?: string;
}

type StudentForm = Omit<Student, "id" | "primary_phone" | "guardian_name">;

const emptyForm: StudentForm = {
    no_control: "", curp: "", name: "", paterno: "", materno: "",
    career: "", generation: "", semester: 0, grupo: "",
    blood_type: null, nss: null,
};

export function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterGrupo, setFilterGrupo] = useState("");
    const [filterCareer, setFilterCareer] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<StudentForm>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [activeTab, setActiveTab] = useState<"info" | "docs">("info");

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (filterGrupo) params.set("grupo", filterGrupo);
        if (filterCareer) params.set("career", filterCareer);

        const q = params.toString();
        const res = await api.get<Student[]>(`/students${q ? `?${q}` : ""}`);
        if (res.success && res.data) setStudents(res.data);
        setLoading(false);
    }, [search, filterGrupo, filterCareer]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    const grupos = [...new Set(students.map((s) => s.grupo))].sort();
    const careers = [...new Set(students.map((s) => s.career))].filter(Boolean).sort();

    const openCreate = () => { setEditingId(null); setForm(emptyForm); setActiveTab("info"); setShowModal(true); };
    const openEdit = (s: Student) => {
        setEditingId(s.id);
        setForm({ no_control: s.no_control, curp: s.curp, name: s.name, paterno: s.paterno, materno: s.materno, career: s.career, generation: s.generation, semester: s.semester, grupo: s.grupo, blood_type: s.blood_type, nss: s.nss });
        setActiveTab("info");
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        if (editingId) {
            await api.put(`/students/${editingId}`, form);
        } else {
            await api.post("/students", form);
        }
        setSaving(false);
        setShowModal(false);
        fetchStudents();
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Estás seguro de dar de baja a este alumno?")) return;
        await api.delete(`/students/${id}`);
        fetchStudents();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-7 h-7 text-brand-500" /> Alumnos
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">{students.length} registrados</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nuevo Alumno
                </button>
            </div>

            {/* Search + Filters */}
            <div className="card !p-3">
                <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, CURP o No. Control..."
                            className="input-field pl-9 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary flex items-center gap-1 text-sm ${showFilters ? "bg-brand-50 border-brand-300" : ""}`}
                    >
                        <Filter className="w-4 h-4" /> Filtros
                        <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
                        <select className="input-field text-sm w-40" value={filterGrupo} onChange={(e) => setFilterGrupo(e.target.value)}>
                            <option value="">Todos los grupos</option>
                            {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select className="input-field text-sm w-56" value={filterCareer} onChange={(e) => setFilterCareer(e.target.value)}>
                            <option value="">Todas las carreras</option>
                            {careers.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">No. Control</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Nombre</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">CURP</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Grupo</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Sem.</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Carrera</th>
                                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Cargando...</td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No hay alumnos. Importa el archivo SISEMS primero.</td></tr>
                            ) : (
                                students.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 text-sm font-mono text-brand-700">{s.no_control}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.paterno} {s.materno} {s.name}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{s.curp}</td>
                                        <td className="px-4 py-3"><span className="badge-success">{s.grupo}</span></td>
                                        <td className="px-4 py-3 text-sm text-gray-600 text-center">{s.semester}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[180px]">{formatCareer(s.career)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {s.primary_phone && (
                                                    <>
                                                    <a 
                                                        href={`https://wa.me/52${s.primary_phone.replace(/\D/g, '')}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        title={`WhatsApp a Tutor: ${s.guardian_name || ''}`}
                                                        className="p-1.5 text-green-500 hover:text-green-700 rounded-lg hover:bg-green-50 transition-colors"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </a>
                                                    <a 
                                                        href={`tel:${s.primary_phone}`} 
                                                        title={`Llamar a Tutor: ${s.guardian_name || ''}`}
                                                        className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                                                    >
                                                        <Phone className="w-4 h-4" />
                                                    </a>
                                                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                                    </>
                                                )}
                                                <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingId ? "Editar Alumno" : "Nuevo Alumno"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex border-b border-gray-100">
                            <button
                                onClick={() => setActiveTab("info")}
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "info" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                            >
                                Información
                            </button>
                            {editingId && (
                                <button
                                    onClick={() => setActiveTab("docs")}
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "docs" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                                >
                                    Expediente Digital
                                </button>
                            )}
                        </div>
                        
                        {activeTab === "info" ? (
                            <>
                                <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="No. Control" value={form.no_control} onChange={(v) => setForm({ ...form, no_control: v })} required disabled={!!editingId} />
                                        <Field label="CURP" value={form.curp} onChange={(v) => setForm({ ...form, curp: v })} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <Field label="Nombre(s)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                                        <Field label="Apellido Paterno" value={form.paterno} onChange={(v) => setForm({ ...form, paterno: v })} required />
                                        <Field label="Apellido Materno" value={form.materno} onChange={(v) => setForm({ ...form, materno: v })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Grupo" value={form.grupo} onChange={(v) => setForm({ ...form, grupo: v })} />
                                        <Field label="Semestre" value={String(form.semester)} onChange={(v) => setForm({ ...form, semester: Number(v) || 0 })} type="number" />
                                    </div>
                                    <Field label="Carrera" value={form.career} onChange={(v) => setForm({ ...form, career: v })} />
                                    <div className="grid grid-cols-3 gap-3">
                                        <Field label="Generación" value={form.generation} onChange={(v) => setForm({ ...form, generation: v })} />
                                        <Field label="Tipo Sangre" value={form.blood_type ?? ""} onChange={(v) => setForm({ ...form, blood_type: v || null })} />
                                        <Field label="NSS" value={form.nss ?? ""} onChange={(v) => setForm({ ...form, nss: v || null })} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 p-5 border-t border-gray-100 bg-gray-50/50">
                                    <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                                    <button onClick={handleSave} disabled={saving} className="btn-primary">
                                        {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <StudentDocumentsTab studentId={editingId!} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, value, onChange, type = "text", required, disabled }: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; required?: boolean; disabled?: boolean;
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
                type={type}
                className="input-field text-sm"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                disabled={disabled}
            />
        </div>
    );
}

function formatCareer(c: string): string {
    if (!c) return "";
    return c
        .replace("TÉCNICO EN ", "")
        .replace("COMPONENTE BASICO Y PROPEDEUTICO", "BÁSICO")
        .replace("COMPONENTE BÁSICO Y PROPEDÉUTICO", "BÁSICO");
}

function StudentDocumentsTab({ studentId }: { studentId: number }) {
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [docType, setDocType] = useState("acta_nacimiento");
    const [file, setFile] = useState<File | null>(null);

    const loadDocs = useCallback(async () => {
        setLoading(true);
        const res = await api.get<any[]>(`/documents/student/${studentId}`);
        if (res.success && res.data) setDocs(res.data);
        setLoading(false);
    }, [studentId]);

    useEffect(() => { loadDocs(); }, [loadDocs]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("student_id", String(studentId));
        formData.append("document_type", docType);

        try {
            const token = localStorage.getItem("edufy_token") || sessionStorage.getItem("edufy_token");
            const res = await fetch("/api/documents/upload", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });
            const data: any = await res.json();
            if (data.success) {
                setFile(null);
                loadDocs(); // reload list
            } else {
                alert(data.error || "Error subiendo archivo");
            }
        } catch (err) {
            console.error(err);
            alert("Error de conexión");
        } finally {
            setUploading(false);
        }
    };

    const docTypes: Record<string, string> = {
        acta_nacimiento: "Acta de Nacimiento",
        curp: "CURP",
        certificado_secundaria: "Certificado de Secundaria",
        comprobante_domicilio: "Comprobante de Domicilio",
        photo: "Fotografía",
        other: "Otro"
    };

    return (
        <div className="p-5 flex flex-col h-[60vh]">
            {/* Upload Area */}
            <form onSubmit={handleUpload} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 shrink-0">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Documento
                </h4>
                <div className="flex flex-col sm:flex-row gap-3">
                    <select 
                        value={docType} 
                        onChange={e => setDocType(e.target.value)}
                        className="input-field text-sm sm:w-1/3"
                    >
                        {Object.entries(docTypes).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                        ))}
                    </select>
                    <input 
                        type="file" 
                        onChange={e => setFile(e.target.files?.[0] || null)}
                        className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 border border-gray-200 rounded-lg p-1 bg-white"
                        required
                    />
                    <button 
                        type="submit" 
                        disabled={!file || uploading}
                        className="btn-primary py-2 px-4 shrink-0 whitespace-nowrap"
                    >
                        {uploading ? "Subiendo..." : "Guardar"}
                    </button>
                </div>
            </form>

            <h4 className="text-sm font-semibold text-gray-700 mb-3 underline underline-offset-4 decoration-gray-200">
                Archivos Guardados
            </h4>
            
            <div className="flex-1 overflow-y-auto pr-2">
                {loading ? (
                    <p className="text-sm text-gray-500 text-center py-8">Cargando...</p>
                ) : docs.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No hay documentos en el expediente virtual.</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {docs.map(doc => (
                            <li key={doc.id} className="flex flex-col sm:flex-row items-center justify-between p-3 bg-white border border-gray-100 shadow-sm rounded-lg hover:border-brand-100 transition-colors">
                                <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                                    <div className="bg-brand-50 p-2 rounded-lg text-brand-600 shrink-0">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{docTypes[doc.document_type] || doc.document_type}</p>
                                        <p className="text-xs text-gray-500 truncate" title={doc.file_name}>{doc.file_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-2 sm:mt-0 w-full sm:w-auto justify-end shrink-0">
                                    <span className="text-xs text-gray-400">
                                        {new Date(doc.uploaded_at).toLocaleDateString()}
                                    </span>
                                    <a 
                                        href={`/api/documents/download/${doc.file_key}`}
                                        target="_blank" rel="noopener noreferrer"
                                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                        title="Descargar/Ver"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
