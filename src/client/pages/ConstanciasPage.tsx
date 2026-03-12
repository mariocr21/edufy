import { useState, useEffect, useCallback } from "react";
import { FileText, Search, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";
import { api } from "../lib/api";

interface DocumentRequest {
    id: number;
    student_id: number;
    student_name: string;
    paterno: string;
    materno: string;
    no_control: string;
    grupo: string;
    request_type: string;
    status: "pending" | "processing" | "completed" | "rejected";
    comments: string | null;
    requested_at: string;
    updated_at: string;
}

export function ConstanciasPage() {
    const [requests, setRequests] = useState<DocumentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        const res = await api.get<DocumentRequest[]>("/documents/requests/all");
        if (res.success && res.data) {
            setRequests(res.data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const requestTypeLabels: Record<string, string> = {
        constancia_estudios: "Constancia de Estudios",
        historial_academico: "Historial Académico",
        carta_buena_conducta: "Carta de Buena Conducta",
        credencial_reposicion: "Reposición de Credencial"
    };

    const statusColors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
        processing: "bg-blue-100 text-blue-800 border-blue-200",
        completed: "bg-green-100 text-green-800 border-green-200",
        rejected: "bg-red-100 text-red-800 border-red-200"
    };

    const filteredRequests = requests.filter(r => 
        r.student_name.toLowerCase().includes(search.toLowerCase()) ||
        r.paterno.toLowerCase().includes(search.toLowerCase()) ||
        r.no_control.includes(search)
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-7 h-7 text-brand-500" /> Trámites y Constancias
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Gestión de solicitudes de alumnos</p>
                </div>
            </div>

            <div className="card !p-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por alumno o control..."
                        className="input-field pl-9 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Fecha</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Alumno</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Grupo</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Trámite</th>
                                <th className="text-center text-xs font-semibold text-gray-500 uppercase px-4 py-3">Estado</th>
                                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Cargando solicitudes...</td></tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No hay trámites pendientes.</td></tr>
                            ) : (
                                filteredRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {new Date(req.requested_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-gray-900">{req.paterno} {req.materno} {req.student_name}</p>
                                            <p className="text-xs text-gray-500 font-mono">{req.no_control}</p>
                                        </td>
                                        <td className="px-4 py-3"><span className="badge-success">{req.grupo}</span></td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                                            {requestTypeLabels[req.request_type] || req.request_type}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[req.status]}`}>
                                                {req.status === 'pending' && <Clock className="w-3 h-3" />}
                                                {req.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                                                {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                                {req.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                className="btn-secondary text-xs px-2 py-1 flex items-center gap-1 ml-auto"
                                                title="Las acciones de trámite aún no están habilitadas"
                                            >
                                                <ExternalLink className="w-3 h-3" /> Revisar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
