import { useEffect, useState } from "react";
import { Users, GraduationCap, BookOpen, ShieldAlert, TrendingUp, CalendarCheck } from "lucide-react";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

interface StatsData {
    total: number;
    by_group: { grupo: string; count: number }[];
    by_career: { career: string; count: number }[];
}

export function DashboardPage() {
    const user = useAuthStore((s) => s.user);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<StatsData>("/students/stats/summary").then((res) => {
            if (res.success && res.data) setStats(res.data);
            setLoading(false);
        });
    }, []);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Buenos días";
        if (hour < 18) return "Buenas tardes";
        return "Buenas noches";
    };

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {greeting()}, {user?.display_name?.split(" ")[0]} 👋
                </h1>
                <p className="text-gray-500 mt-1">Panel de control del CETMAR No. 42</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <StatCard
                    icon={Users}
                    label="Alumnos Inscritos"
                    value={loading ? "—" : String(stats?.total ?? 0)}
                    color="blue"
                />
                <StatCard
                    icon={GraduationCap}
                    label="Docentes"
                    value="—"
                    color="emerald"
                    subtext="Pendiente importar XML"
                />
                <StatCard
                    icon={BookOpen}
                    label="Especialidades"
                    value="3"
                    color="purple"
                    subtext="ACUA · PIA · RSIA"
                />
                <StatCard
                    icon={CalendarCheck}
                    label="Período Activo"
                    value="25-1"
                    color="amber"
                    subtext="Semestral 1 - 2025"
                />
            </div>

            {/* Groups Overview */}
            {stats && stats.by_group.length > 0 && (
                <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-brand-500" />
                        Alumnos por Grupo
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {stats.by_group.map((g) => (
                            <div
                                key={g.grupo}
                                className="p-4 bg-gradient-to-br from-brand-50 to-ocean-50 rounded-xl border border-brand-100"
                            >
                                <p className="text-2xl font-bold text-brand-700">{g.count}</p>
                                <p className="text-sm text-gray-600 font-medium">{g.grupo}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-brand-500" />
                    Acciones Rápidas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <QuickAction
                        label="Importar Calificaciones SISEMS"
                        description="Sube el archivo XLSX de SISEMS"
                        href="/importar"
                    />
                    <QuickAction
                        label="Importar Horarios"
                        description="Sube el XML de aSc Timetables"
                        href="/importar"
                    />
                    <QuickAction
                        label="Pasar Lista"
                        description="Registra la asistencia del día"
                        href="/asistencia"
                    />
                </div>
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    color,
    subtext,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    color: "blue" | "emerald" | "purple" | "amber";
    subtext?: string;
}) {
    const colors = {
        blue: "bg-blue-100 text-blue-600",
        emerald: "bg-emerald-100 text-emerald-600",
        purple: "bg-purple-100 text-purple-600",
        amber: "bg-amber-100 text-amber-600",
    };

    return (
        <div className="stat-card">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
                {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
            </div>
        </div>
    );
}

function QuickAction({ label, description, href }: { label: string; description: string; href: string }) {
    return (
        <a
            href={href}
            className="block p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50/50 transition-all group"
        >
            <p className="font-medium text-gray-900 group-hover:text-brand-700 transition-colors">{label}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
        </a>
    );
}
