import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
    ShieldAlert,
    Search,
    Plus,
    Filter,
    FileText,
    Trash2,
    X,
    UserCircle,
    AlertTriangle,
    Save
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";

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
    reported_by: number;
    reported_by_name: string;
    report_type: "amonestacion" | "suspension" | "nota";
    description: string;
    date: string;
    created_at: string;
    
    // Joined from student
    student_name?: string;
    paterno?: string;
    materno?: string;
    no_control?: string;
    grupo?: string;
}

export function PrefectPage() {
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState<ConductReport[]>([]);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchingStudents, setSearchingStudents] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        report_type: "amonestacion" as "amonestacion" | "suspension" | "nota",
        description: "",
        date: format(new Date(), "yyyy-MM-dd")
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadRecentReports();
    }, []);

    useEffect(() => {
        if (!isModalOpen || selectedStudent) {
            return;
        }

        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery.length < 3) {
            setStudents([]);
            setSearchingStudents(false);
            return;
        }

        const timeoutId = window.setTimeout(() => {
            void searchStudents(trimmedQuery);
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [isModalOpen, searchQuery, selectedStudent]);

    const loadRecentReports = async () => {
        try {
            setLoading(true);
            const token = useAuthStore.getState().token;
            const res = await fetch("/api/conduct/recent?limit=50", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json() as { success: boolean; data: ConductReport[] };
            if (data.success) {
                setReports(data.data || []);
            }
        } catch (error) {
            console.error("Error loading reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const searchStudents = async (query: string) => {
        if (query.length < 3) {
            setStudents([]);
            setSearchingStudents(false);
            return;
        }
        
        try {
            setSearchingStudents(true);
            const token = useAuthStore.getState().token;
            const params = new URLSearchParams({
                search: query,
                limit: "10",
            });
            const res = await fetch(`/api/students?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json() as { success: boolean; data: Student[] };
            if (data.success) {
                setStudents(data.data);
            } else {
                setStudents([]);
            }
        } catch (error) {
            console.error("Error searching students:", error);
            setStudents([]);
        } finally {
            setSearchingStudents(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const openModal = () => {
        setIsModalOpen(true);
        setSelectedStudent(null);
        setSearchQuery("");
        setStudents([]);
        setFormData({
            report_type: "amonestacion",
            description: "",
            date: format(new Date(), "yyyy-MM-dd")
        });
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;
        
        try {
            setSubmitting(true);
            const token = useAuthStore.getState().token;
            const payload = {
                student_id: selectedStudent.id,
                ...formData
            };

            const res = await fetch("/api/conduct", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json() as { success: boolean; error?: string };
            if (data.success) {
                closeModal();
                loadRecentReports(); // Reload the list
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            console.error("Error submitting report:", error);
            alert("Error al guardar el reporte");
        } finally {
            setSubmitting(false);
        }
    };

    const deleteReport = async (id: number) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este reporte?")) return;
        
        try {
            const token = useAuthStore.getState().token;
            const res = await fetch(`/api/conduct/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json() as { success: boolean; error?: string };
            
            if (data.success) {
                setReports(prev => prev.filter(r => r.id !== id));
            } else {
                alert("Error: " + data.error);
            }
        } catch (error) {
            console.error("Error deleting report:", error);
        }
    };

    const getReportTypeBadge = (type: string) => {
        switch (type) {
            case "suspension":
                return <span className="inline-flex py-1 px-2.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">Suspensión</span>;
            case "amonestacion":
                return <span className="inline-flex py-1 px-2.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">Amonestación</span>;
            case "nota":
                return <span className="inline-flex py-1 px-2.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Nota Positiva/Informativa</span>;
            default:
                return <span className="inline-flex py-1 px-2.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{type}</span>;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
                        <ShieldAlert className="w-7 h-7 mr-2 text-brand-600" />
                        Módulo de Prefectura
                    </h1>
                    <p className="text-gray-500 mt-1">Gestión de incidencias y reportes disciplinarios</p>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={openModal}
                        className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Reporte
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="font-medium text-gray-900 flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-gray-500" />
                        Reportes Recientes
                    </h2>
                    <button className="text-sm text-gray-500 hover:text-gray-900 flex items-center">
                        <Filter className="w-4 h-4 mr-1" />
                        Filtros
                    </button>
                </div>
                
                {loading ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin mb-4" />
                        Cargando reportes...
                    </div>
                ) : reports.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">
                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <ShieldAlert className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No hay reportes recientes</h3>
                        <p className="mt-1">Crea un nuevo reporte usando el botón superior.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4">Alumno</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Descripción</th>
                                    <th className="px-6 py-4">Reportado por</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                            {format(parseISO(report.date), "dd/MM/yyyy")}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">
                                                {report.paterno} {report.materno} {report.student_name}
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                                <span>{report.no_control}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                <span>Grupo {report.grupo}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getReportTypeBadge(report.report_type)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={report.description}>
                                            {report.description}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            {report.reported_by_name || 'Sistema'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => deleteReport(report.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                title="Eliminar reporte"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Nuevo Reporte */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <AlertTriangle className="w-5 h-5 mr-2 text-brand-500" />
                                Registrar Incidencia
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form id="conduct-form" onSubmit={handleSubmit} className="space-y-5">
                                {/* Student Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Buscar Alumno <span className="text-red-500">*</span>
                                    </label>
                                    {!selectedStudent ? (
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Búsqueda por nombre o matrícula (min. 3 letras)..."
                                                value={searchQuery}
                                                onChange={handleSearchChange}
                                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            />
                                            {searchingStudents && (
                                                <div className="mt-2 text-xs text-gray-500">
                                                    Buscando alumnos...
                                                </div>
                                            )}
                                            {students.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                                    {students.map(s => (
                                                        <div 
                                                            key={s.id}
                                                            onClick={() => {
                                                                setSelectedStudent(s);
                                                                setSearchQuery("");
                                                                setStudents([]);
                                                            }}
                                                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                        >
                                                            <div className="font-medium text-sm text-gray-900">{s.paterno} {s.materno} {s.name}</div>
                                                            <div className="text-xs text-gray-500">{s.no_control} - {s.grupo}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-brand-50 border border-brand-100 rounded-lg">
                                            <div className="flex items-center">
                                                <UserCircle className="w-8 h-8 text-brand-600 mr-3" />
                                                <div>
                                                    <div className="font-medium text-brand-900 text-sm">{selectedStudent.paterno} {selectedStudent.materno} {selectedStudent.name}</div>
                                                    <div className="text-xs text-brand-700">{selectedStudent.no_control} • Grupo {selectedStudent.grupo}</div>
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setSelectedStudent(null)}
                                                className="p-1.5 text-brand-600 hover:bg-brand-100 rounded-md transition-colors"
                                                title="Cambiar alumno"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tipo de Reporte <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.report_type}
                                            onChange={e => setFormData({ ...formData, report_type: e.target.value as any })}
                                            className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                                            required
                                        >
                                            <option value="amonestacion">Amonestación verbal/escrita</option>
                                            <option value="suspension">Suspensión</option>
                                            <option value="nota">Nota Positiva/Informativa</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fecha de Incidencia <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Descripción <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500 resize-none h-28"
                                        placeholder="Describe la incidencia o reporte..."
                                        required
                                    />
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="conduct-form"
                                disabled={submitting || !selectedStudent}
                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 min-w-[120px]"
                            >
                                {submitting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
