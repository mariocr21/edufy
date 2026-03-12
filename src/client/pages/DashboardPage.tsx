import { useState, useEffect } from "react";
import { 
    Users, 
    GraduationCap, 
    Calendar, 
    TrendingUp,
    AlertTriangle,
    ShieldAlert
} from "lucide-react";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Legend
} from "recharts";
import { useAuthStore } from "../stores/authStore";

interface DashboardData {
    summary: {
        totalStudents: number;
        totalTeachers: number;
        totalGroups: number;
        attendanceRate: number;
    };
    charts: {
        attendanceByGroup: { name: string; asistencia: number }[];
    };
    recentIncidents: any[];
    activePeriodName: string;
}

export function DashboardPage() {
    const user = useAuthStore(state => state.user);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData | null>(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const token = useAuthStore.getState().token;
            const res = await fetch("/api/dashboard/stats", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await res.json() as { success: boolean, data: DashboardData };
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin mb-4" />
                <p className="text-gray-500">Cargando métricas...</p>
            </div>
        );
    }

    const { summary, charts, recentIncidents, activePeriodName } = data;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        ¡Hola, {user?.display_name?.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Resumen general • <span className="font-medium text-brand-600">{activePeriodName}</span>
                    </p>
                </div>
                <div className="hidden sm:block">
                    <div className="bg-brand-50 text-brand-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-500 text-sm">Alumnos Activos</h3>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-gray-900">{summary.totalStudents}</p>
                        <p className="text-xs text-green-600 font-medium mt-1 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Matrícula total
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-500 text-sm">Docentes</h3>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-gray-900">{summary.totalTeachers}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            Plantilla activa
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-500 text-sm">Grupos del Período</h3>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-gray-900">{summary.totalGroups}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            Grupos formados
                        </p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-500 text-sm">Asistencia de Hoy</h3>
                        <div className={`p-2 rounded-lg ${summary.attendanceRate >= 85 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {summary.attendanceRate >= 85 ? <TrendingUp className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        </div>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-gray-900">{summary.attendanceRate}%</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            Basado en pases de lista
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Asistencia por Grupo (Hoy)</h2>
                    <div className="h-72 w-full">
                        {charts.attendanceByGroup.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.attendanceByGroup} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} domain={[0, 100]} />
                                    <Tooltip 
                                        cursor={{fill: '#F3F4F6'}}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="asistencia" name="% Asistencia" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <BarChart className="w-8 h-8 mb-2 opacity-50" />
                                <p>Sin datos de asistencia para mostrar</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Incidents & Alerts */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <ShieldAlert className="w-5 h-5 mr-2 text-brand-600" />
                                Últimas Incidencias
                            </h2>
                        </div>
                        
                        <div className="space-y-4">
                            {recentIncidents.length > 0 ? (
                                recentIncidents.map((incident) => (
                                    <div key={incident.id} className="flex gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                        <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                                            incident.report_type === 'suspension' ? 'bg-red-500' :
                                            incident.report_type === 'amonestacion' ? 'bg-orange-500' : 'bg-blue-500'
                                        }`} />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {incident.name} {incident.paterno}
                                            </p>
                                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                                {incident.description}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-4">No hay incidencias reportadas recientemente.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
