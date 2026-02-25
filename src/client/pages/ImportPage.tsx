import { useState, useEffect, useCallback } from "react";
import {
    Upload,
    FileSpreadsheet,
    FileText,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    Database,
    Users,
    GraduationCap,
    BookOpen,
    Calendar,
    Clock,
    Plus,
} from "lucide-react";
import { useAuthStore } from "../stores/authStore";

interface Period {
    id: number;
    name: string;
    year: number;
    semester_type: string;
    active: number;
}

interface ImportStats {
    students: number;
    teachers: number;
    subjects: number;
    groups: number;
    schedules: number;
    grades: number;
}

type ImportStep = "select" | "uploading" | "success" | "error";

export function ImportPage() {
    const [periods, setPeriods] = useState<Period[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
    const [stats, setStats] = useState<ImportStats | null>(null);
    const [importStep, setImportStep] = useState<ImportStep>("select");
    const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);
    const [importError, setImportError] = useState("");
    const [importType, setImportType] = useState<"sisems" | "horarios" | null>(null);
    const [showNewPeriod, setShowNewPeriod] = useState(false);
    const token = useAuthStore((s) => s.token);

    const fetchPeriods = useCallback(async () => {
        const res = await fetch("/api/import/periods", {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json() as { success: boolean; data: Period[] };
        if (data.success) {
            setPeriods(data.data);
            const active = data.data.find((p) => p.active);
            if (active && !selectedPeriod) setSelectedPeriod(active.id);
        }
    }, [token, selectedPeriod]);

    const fetchStats = useCallback(async () => {
        const res = await fetch("/api/import/stats", {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json() as { success: boolean; data: ImportStats };
        if (data.success) setStats(data.data);
    }, [token]);

    useEffect(() => {
        fetchPeriods();
        fetchStats();
    }, [fetchPeriods, fetchStats]);

    const handleFileUpload = async (file: File, type: "sisems" | "horarios") => {
        if (!selectedPeriod) {
            setImportError("Selecciona un período antes de importar");
            setImportStep("error");
            return;
        }

        setImportType(type);
        setImportStep("uploading");
        setImportError("");
        setImportResult(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("period_id", String(selectedPeriod));

            const endpoint = type === "sisems" ? "/api/import/sisems" : "/api/import/horarios";
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json() as { success: boolean; data?: Record<string, unknown>; error?: string };

            if (data.success) {
                setImportResult(data.data ?? null);
                setImportStep("success");
                fetchStats(); // Refresh stats
            } else {
                setImportError(data.error || "Error desconocido");
                setImportStep("error");
            }
        } catch {
            setImportError("Error de conexión al servidor");
            setImportStep("error");
        }
    };

    const resetImport = () => {
        setImportStep("select");
        setImportResult(null);
        setImportError("");
        setImportType(null);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Importar Datos</h1>
                <p className="text-gray-500 mt-1">
                    Carga archivos de SISEMS y horarios para cada ciclo escolar
                </p>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <MiniStat icon={Users} label="Alumnos" value={stats.students} />
                    <MiniStat icon={GraduationCap} label="Docentes" value={stats.teachers} />
                    <MiniStat icon={BookOpen} label="Materias" value={stats.subjects} />
                    <MiniStat icon={Calendar} label="Grupos" value={stats.groups} />
                    <MiniStat icon={Clock} label="Horarios" value={stats.schedules} />
                    <MiniStat icon={Database} label="Calificaciones" value={stats.grades} />
                </div>
            )}

            {/* Period Selector */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Período Escolar</h3>
                    <button
                        onClick={() => setShowNewPeriod(!showNewPeriod)}
                        className="btn-secondary text-sm flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Período
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {periods.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPeriod(p.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedPeriod === p.id
                                    ? "bg-brand-600 text-white shadow-md"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                } ${p.active ? "ring-2 ring-brand-300" : ""}`}
                        >
                            {p.name}
                            {p.active ? " ✦" : ""}
                        </button>
                    ))}
                    {periods.length === 0 && (
                        <p className="text-gray-400 text-sm">No hay períodos. Crea uno primero.</p>
                    )}
                </div>

                {showNewPeriod && (
                    <NewPeriodForm
                        token={token!}
                        onCreated={() => {
                            setShowNewPeriod(false);
                            fetchPeriods();
                        }}
                    />
                )}
            </div>

            {/* Import Area */}
            {importStep === "select" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <UploadCard
                        title="Matrícula SISEMS"
                        description="Archivo .xlsx de calificaciones o matrícula exportado de SISEMS. Detecta automáticamente si tiene 12 columnas (solo alumnos) o 22 columnas (alumnos + calificaciones)."
                        icon={FileSpreadsheet}
                        accept=".xlsx,.xls"
                        color="blue"
                        disabled={!selectedPeriod}
                        onUpload={(file) => handleFileUpload(file, "sisems")}
                    />
                    <UploadCard
                        title="Horarios aSc Timetables"
                        description="Archivo .xml exportado de aSc Timetables. Importa docentes, materias, grupos y el horario completo semanal."
                        icon={FileText}
                        accept=".xml"
                        color="emerald"
                        disabled={!selectedPeriod}
                        onUpload={(file) => handleFileUpload(file, "horarios")}
                    />
                </div>
            )}

            {importStep === "uploading" && (
                <div className="card flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Procesando {importType === "sisems" ? "SISEMS" : "Horarios"}...
                    </h3>
                    <p className="text-gray-500 mt-1">Esto puede tardar unos segundos</p>
                </div>
            )}

            {importStep === "success" && importResult && (
                <div className="card border-emerald-200 bg-emerald-50/50">
                    <div className="flex items-start gap-3 mb-4">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-lg font-semibold text-emerald-900">Importación Exitosa</h3>
                            <p className="text-sm text-emerald-700 mt-1">
                                {importType === "sisems"
                                    ? `Tipo: ${(importResult.type as string) === "grades" ? "Calificaciones (22 cols)" : "Matrícula (12 cols)"}`
                                    : "Horarios importados correctamente"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        {Object.entries(importResult).map(([key, value]) => {
                            if (key === "warnings" || key === "type") return null;
                            return (
                                <div key={key} className="bg-white rounded-lg p-3 border border-emerald-200">
                                    <p className="text-xl font-bold text-emerald-700">
                                        {Array.isArray(value) ? value.length : String(value)}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        {formatResultKey(key)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Warnings */}
                    {Array.isArray(importResult.warnings) && (importResult.warnings as string[]).length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                            <p className="text-sm font-medium text-amber-800 mb-1">
                                ⚠️ Advertencias ({(importResult.warnings as string[]).length})
                            </p>
                            <ul className="text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
                                {(importResult.warnings as string[]).map((w, i) => (
                                    <li key={i}>• {w}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button onClick={resetImport} className="btn-primary mt-4 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Importar Otro Archivo
                    </button>
                </div>
            )}

            {importStep === "error" && (
                <div className="card border-red-200 bg-red-50/50">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-lg font-semibold text-red-900">Error en Importación</h3>
                            <p className="text-sm text-red-700 mt-1">{importError}</p>
                        </div>
                    </div>
                    <button onClick={resetImport} className="btn-secondary mt-4">
                        Intentar de Nuevo
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Sub-components ──

function MiniStat({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
            <Icon className="w-5 h-5 text-gray-400" />
            <div>
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
            </div>
        </div>
    );
}

function UploadCard({
    title,
    description,
    icon: Icon,
    accept,
    color,
    disabled,
    onUpload,
}: {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accept: string;
    color: "blue" | "emerald";
    disabled: boolean;
    onUpload: (file: File) => void;
}) {
    const [isDragging, setIsDragging] = useState(false);

    const colors = {
        blue: {
            bg: "bg-blue-50 hover:bg-blue-100/70",
            border: "border-blue-200",
            borderActive: "border-blue-400 bg-blue-100",
            icon: "text-blue-500",
            text: "text-blue-700",
        },
        emerald: {
            bg: "bg-emerald-50 hover:bg-emerald-100/70",
            border: "border-emerald-200",
            borderActive: "border-emerald-400 bg-emerald-100",
            icon: "text-emerald-500",
            text: "text-emerald-700",
        },
    };

    const c = colors[color];

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onUpload(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onUpload(file);
        e.target.value = ""; // Reset to allow re-uploading same file
    };

    return (
        <div
            className={`card transition-all ${isDragging ? c.borderActive : ""} ${disabled ? "opacity-50 pointer-events-none" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.bg} ${c.border} border`}>
                    <Icon className={`w-6 h-6 ${c.icon}`} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                </div>
            </div>

            <label
                className={`flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed ${c.border} ${c.bg} cursor-pointer transition-all`}
            >
                <Upload className={`w-8 h-8 ${c.icon} mb-2`} />
                <span className={`text-sm font-medium ${c.text}`}>
                    Arrastra el archivo aquí o haz clic
                </span>
                <span className="text-xs text-gray-400 mt-1">
                    Acepta: {accept}
                </span>
                <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </label>
        </div>
    );
}

function NewPeriodForm({ token, onCreated }: { token: string; onCreated: () => void }) {
    const [name, setName] = useState("");
    const [year, setYear] = useState(new Date().getFullYear());
    const [semType, setSemType] = useState<"odd" | "even">("even");
    const [active, setActive] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await fetch("/api/import/period", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                name: name || `SEMESTRAL ${semType === "odd" ? "1" : "2"} - ${year}`,
                year,
                semester_type: semType,
                active,
            }),
        });

        const data = await res.json() as { success: boolean };
        if (data.success) onCreated();
        setLoading(false);
    };

    return (
        <form onSubmit={handleCreate} className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                    <input
                        type="text"
                        className="input-field text-sm"
                        placeholder={`SEMESTRAL ${semType === "odd" ? "1" : "2"} - ${year}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Año</label>
                    <input
                        type="number"
                        className="input-field text-sm"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Semestre</label>
                    <select
                        className="input-field text-sm"
                        value={semType}
                        onChange={(e) => setSemType(e.target.value as "odd" | "even")}
                    >
                        <option value="odd">Nones (1, 3, 5)</option>
                        <option value="even">Pares (2, 4, 6)</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="rounded"
                    />
                    Período activo
                </label>
                <button type="submit" disabled={loading} className="btn-primary text-sm ml-auto">
                    {loading ? "Creando..." : "Crear Período"}
                </button>
            </div>
        </form>
    );
}

function formatResultKey(key: string): string {
    const labels: Record<string, string> = {
        studentsFound: "Alumnos en archivo",
        studentsUpserted: "Alumnos procesados",
        gradesFound: "Calificaciones",
        gradesImported: "Calif. importadas",
        groupsCreated: "Grupos creados",
        teachersFound: "Docentes en archivo",
        teachersUpserted: "Docentes procesados",
        subjectsFound: "Materias en archivo",
        subjectsUpserted: "Materias procesadas",
        classesFound: "Clases en archivo",
        cardsFound: "Horarios en archivo",
        schedulesCreated: "Horarios creados",
        groupsCreated_count: "Grupos creados",
    };
    return labels[key] || key.replace(/([A-Z])/g, " $1").replace(/_/g, " ");
}
