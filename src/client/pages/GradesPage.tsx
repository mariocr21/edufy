import { useState, useEffect, useCallback } from "react";
import {
    GraduationCap,
    Search,
    Filter,
    Download,
    BookOpen,
    Users,
    TrendingUp
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";

// Type definitions
interface GradeRow {
    id: number;
    student_id: number;
    period_id: number;
    subject_id: number;
    parcial1: number | null;
    parcial2: number | null;
    parcial3: number | null;
    final_score: number | null;
    extraordinario: number | null;
    status: string | null;
    
    // Joined fields
    no_control: string;
    student_name: string;
    paterno: string;
    materno: string;
    subject_name: string;
    subject_code: string;
}

interface Period {
    id: number;
    name: string;
    year: number;
    semester: string;
}

interface Group {
    id: number;
    name: string;
    period_id: number;
}

export function GradesPage() {
    const [loading, setLoading] = useState(false);
    const [grades, setGrades] = useState<GradeRow[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Filters
    const [periods, setPeriods] = useState<Period[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string>("");
    const [selectedGroup, setSelectedGroup] = useState<string>("");
    
    // Stats
    const [stats, setStats] = useState({
        average_score: 0,
        passing_count: 0,
        failing_count: 0,
        total_grades: 0
    });

    const loadCatalogs = useCallback(async () => {
        try {
            const token = useAuthStore.getState().token;
            const headers = { Authorization: `Bearer ${token}` };

            const [periodsRes, groupsRes] = await Promise.all([
                fetch("/api/import/periods", { headers }),
                fetch("/api/catalogs/groups", { headers })
            ]);

            const periodsData = await periodsRes.json() as { success: boolean; data: Period[] };
            const groupsData = await groupsRes.json() as { success: boolean; data: Group[] };

            if (periodsData.success) {
                setPeriods(periodsData.data);
                // Select active period by default if available, or first one
                const defaultPeriod = periodsData.data[0];
                if (defaultPeriod) setSelectedPeriod(defaultPeriod.id.toString());
            }

            if (groupsData.success) {
                setGroups(groupsData.data);
            }
        } catch (error) {
            console.error("Error loading catalogs:", error);
        }
    }, []);

    const loadGrades = useCallback(async () => {
        if (!selectedGroup) return;
        
        try {
            setLoading(true);
            const token = useAuthStore.getState().token;
            let url = `/api/grades/group/${selectedGroup}`;
            if (selectedPeriod) url += `?period_id=${selectedPeriod}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json() as { success: boolean; data: GradeRow[] };
            
            if (data.success) {
                setGrades(data.data || []);
            }
        } catch (error) {
            console.error("Error loading grades:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedGroup, selectedPeriod]);

    const loadStats = useCallback(async () => {
        try {
            const token = useAuthStore.getState().token;
            let url = `/api/grades/stats`;
            if (selectedPeriod) url += `?period_id=${selectedPeriod}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json() as { success: boolean; data: any };
            
            if (data.success && data.data) {
                setStats({
                    average_score: data.data.average_score || 0,
                    passing_count: data.data.passing_count || 0,
                    failing_count: data.data.failing_count || 0,
                    total_grades: data.data.total_grades || 0
                });
            }
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    }, [selectedPeriod]);

    // Initial load: fetch catalogs
    useEffect(() => {
        loadCatalogs();
    }, [loadCatalogs]);

    // When filters change, load data
    useEffect(() => {
        if (selectedGroup) {
            loadGrades();
        } else {
            setGrades([]);
        }

        if (selectedPeriod) {
            loadStats();
        }
    }, [loadGrades, loadStats, selectedGroup, selectedPeriod]);

    const filteredGrades = grades.filter(g => {
        const fullName = `${g.paterno} ${g.materno} ${g.student_name}`.toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        return fullName.includes(searchLower) || 
               g.no_control.toLowerCase().includes(searchLower) ||
               (g.subject_name && g.subject_name.toLowerCase().includes(searchLower));
    });

    const formatScore = (num: number | null) => {
        if (num === null) return "-";
        return num.toFixed(1);
    };

    const getScoreColor = (num: number | null) => {
        if (num === null) return "text-gray-500";
        if (num >= 8) return "text-green-600 font-medium";
        if (num >= 6) return "text-yellow-600 font-medium";
        return "text-red-600 font-medium";
    };

    // Filter groups by selected period
    const availableGroups = groups.filter(g => !selectedPeriod || g.period_id.toString() === selectedPeriod);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
                        <GraduationCap className="w-7 h-7 mr-2 text-brand-600" />
                        Calificaciones SISEMS
                    </h1>
                    <p className="text-gray-500 mt-1">Consulta los historiales académicos y calificaciones importadas</p>
                </div>

                <div className="flex gap-2">
                    <button className="flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar XLSX
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Promedio General</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.average_score.toFixed(1)}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Calificaciones Aprobatorias</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.passing_count}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Calificaciones Acumuladas</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total_grades}</p>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Período</label>
                    <select 
                        value={selectedPeriod}
                        onChange={e => {
                            setSelectedPeriod(e.target.value);
                            setSelectedGroup(""); // Reset group when period changes
                        }}
                        className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500 bg-gray-50"
                    >
                        <option value="">Todos los períodos</option>
                        {periods.map(p => (
                            <option key={p.id} value={p.id.toString()}>{p.name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Grupo SISEMS</label>
                    <select 
                        value={selectedGroup}
                        onChange={e => setSelectedGroup(e.target.value)}
                        className="w-full text-sm border-gray-200 rounded-lg focus:ring-brand-500 focus:border-brand-500 bg-gray-50"
                    >
                        <option value="">Selecciona un grupo...</option>
                        {availableGroups.map(g => (
                            <option key={g.id} value={g.id.toString()}>{g.name}</option>
                        ))}
                    </select>
                </div>

                <div className="md:w-64 flex-shrink-0">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Buscar alumno o materia</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow bg-gray-50"
                        />
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-16 text-gray-500">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin mb-4" />
                        Cargando calificaciones...
                    </div>
                ) : !selectedGroup ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Filter className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Selecciona un grupo</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            Elige un grupo de la lista superior para ver las calificaciones importadas del SISEMS.
                        </p>
                    </div>
                ) : grades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center text-gray-500">
                        <GraduationCap className="w-12 h-12 text-gray-300 mb-4" />
                        <p>No se encontraron calificaciones para este grupo.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200 whitespace-nowrap">
                                <tr>
                                    <th className="px-6 py-4">No. Control</th>
                                    <th className="px-6 py-4">Alumno</th>
                                    <th className="px-6 py-4">Materia</th>
                                    <th className="px-3 py-4 text-center">P1</th>
                                    <th className="px-3 py-4 text-center">P2</th>
                                    <th className="px-3 py-4 text-center">P3</th>
                                    <th className="px-4 py-4 text-center bg-gray-100 font-bold">Final</th>
                                    <th className="px-3 py-4 text-center">Extra</th>
                                    <th className="px-6 py-4">Estatus</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredGrades.map((row, idx) => (
                                    <tr key={`${row.id}-${idx}`} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 text-gray-500 font-mono text-xs">{row.no_control}</td>
                                        <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">
                                            {row.paterno} {row.materno} {row.student_name}
                                        </td>
                                        <td className="px-6 py-3 text-gray-600 max-w-[200px] truncate" title={row.subject_name}>
                                            {row.subject_name || <span className="text-gray-400 italic">Desconocida</span>}
                                        </td>
                                        <td className="px-3 py-3 text-center text-gray-600">{formatScore(row.parcial1)}</td>
                                        <td className="px-3 py-3 text-center text-gray-600">{formatScore(row.parcial2)}</td>
                                        <td className="px-3 py-3 text-center text-gray-600">{formatScore(row.parcial3)}</td>
                                        <td className={`px-4 py-3 text-center bg-gray-50/50 ${getScoreColor(row.final_score)}`}>
                                            {formatScore(row.final_score)}
                                        </td>
                                        <td className="px-3 py-3 text-center text-gray-500">{formatScore(row.extraordinario)}</td>
                                        <td className="px-6 py-3">
                                            {row.status ? (
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
                                                    ${row.status.toLowerCase().includes('aprobado') || row.status.toLowerCase().includes('a') 
                                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                                        : 'bg-red-50 text-red-700 border-red-200'}
                                                `}>
                                                    {row.status}
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredGrades.length === 0 && (
                            <div className="p-12 text-center text-gray-500 bg-gray-50 border-t border-gray-100">
                                Ningún alumno coincide con tu búsqueda
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
