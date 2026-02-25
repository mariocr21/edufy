import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Edit3, Trash2, X, GraduationCap } from "lucide-react";
import { api } from "../lib/api";

interface Teacher {
    id: number;
    xml_id: string | null;
    name: string;
    short_name: string;
    specialty: string | null;
}

type TeacherForm = { name: string; short_name: string; specialty: string | null };
const emptyForm: TeacherForm = { name: "", short_name: "", specialty: null };

export function TeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<TeacherForm>(emptyForm);
    const [saving, setSaving] = useState(false);

    const fetchTeachers = useCallback(async () => {
        setLoading(true);
        const q = search ? `?search=${encodeURIComponent(search)}` : "";
        const res = await api.get<Teacher[]>(`/teachers${q}`);
        if (res.success && res.data) setTeachers(res.data);
        setLoading(false);
    }, [search]);

    useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

    const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (t: Teacher) => {
        setEditingId(t.id);
        setForm({ name: t.name, short_name: t.short_name, specialty: t.specialty });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        if (editingId) {
            await api.put(`/teachers/${editingId}`, form);
        } else {
            await api.post("/teachers", form);
        }
        setSaving(false);
        setShowModal(false);
        fetchTeachers();
    };

    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar este docente?")) return;
        await api.delete(`/teachers/${id}`);
        fetchTeachers();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <GraduationCap className="w-7 h-7 text-brand-500" /> Docentes
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">{teachers.length} registrados</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nuevo Docente
                </button>
            </div>

            {/* Search */}
            <div className="card !p-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        className="input-field pl-9 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <p className="text-gray-400 col-span-full text-center py-12">Cargando...</p>
                ) : teachers.length === 0 ? (
                    <p className="text-gray-400 col-span-full text-center py-12">No hay docentes. Importa el XML de horarios.</p>
                ) : (
                    teachers.map((t) => (
                        <div key={t.id} className="card hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-bold text-emerald-700">
                                            {t.short_name?.slice(0, 2).toUpperCase() || t.name.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm">{t.name}</h3>
                                        <p className="text-xs text-gray-500">{t.short_name}</p>
                                        {t.specialty && <span className="badge-success text-[10px] mt-1">{t.specialty}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-brand-600 rounded-lg hover:bg-brand-50">
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingId ? "Editar Docente" : "Nuevo Docente"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
                                <input className="input-field text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre corto</label>
                                <input className="input-field text-sm" value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Especialidad</label>
                                <input className="input-field text-sm" value={form.specialty ?? ""} onChange={(e) => setForm({ ...form, specialty: e.target.value || null })} placeholder="Opcional" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
                            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary">
                                {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
