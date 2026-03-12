import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import {
    IdCard,
    Search,
    Printer,
    Download,
    QrCode,
    Camera,
    RefreshCw,
    CheckCircle2,
    XCircle
} from "lucide-react";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAuthStore } from "../stores/authStore";

interface CredentialRow {
    student_id: number;
    no_control: string;
    name: string;
    paterno: string;
    materno: string;
    grupo: string;
    qr_token: string | null;
    is_active: number | null;
    issued_at: string | null;
}

interface EntryLog {
    id: number;
    student_name: string;
    paterno: string;
    materno: string;
    no_control: string;
    grupo: string;
    scan_type: "entry" | "exit";
    timestamp: string;
    scanned_by_name: string;
}

export function CredentialsPage() {
    const user = useAuthStore(s => s.user);
    const [loading, setLoading] = useState(false);
    
    // View state: 'list', 'scan', 'logs'
    const [view, setView] = useState<"list" | "scan" | "logs">("list");
    
    // Credentials List State
    const [students, setStudents] = useState<CredentialRow[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [generating, setGenerating] = useState(false);
    
    // Scanner State
    const [scanInput, setScanInput] = useState("");
    const [scanResult, setScanResult] = useState<{success: boolean, message: string, student?: any} | null>(null);
    const [scanType, setScanType] = useState<"entry" | "exit">("entry");
    const scanInputRef = useRef<HTMLInputElement>(null);

    // Logs State
    const [logs, setLogs] = useState<EntryLog[]>([]);

    useEffect(() => {
        if (view === "list") loadStudents();
        if (view === "logs") loadLogs();
        if (view === "scan" && scanInputRef.current) {
            scanInputRef.current.focus();
        }
    }, [view]);

    const loadStudents = async () => {
        try {
            setLoading(true);
            const token = useAuthStore.getState().token;
            const res = await fetch("/api/credentials", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json() as { success: boolean; data: CredentialRow[] };
            if (data.success) {
                setStudents(data.data || []);
            }
        } catch (error) {
            console.error("Error loading credentials:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadLogs = async () => {
        try {
            setLoading(true);
            const token = useAuthStore.getState().token;
            const res = await fetch("/api/credentials/logs", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json() as { success: boolean; data: EntryLog[] };
            if (data.success) {
                setLogs(data.data || []);
            }
        } catch (error) {
            console.error("Error loading logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredStudents.map(s => s.student_id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelect = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const generateQRs = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`¿Generar credenciales (QRs) para ${selectedIds.size} alumnos seleccionados?`)) return;

        try {
            setGenerating(true);
            const token = useAuthStore.getState().token;
            const res = await fetch("/api/credentials/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ student_ids: Array.from(selectedIds) })
            });
            const data = await res.json() as { success: boolean; message: string };
            if (data.success) {
                alert(data.message);
                loadStudents();
                setSelectedIds(new Set());
            }
        } catch (error) {
            console.error("Error generating QRs:", error);
        } finally {
            setGenerating(false);
        }
    };

    // Very basic PDF layout logic (for real world, this needs fine-tuning)
    const printSelected = async () => {
        if (selectedIds.size === 0) return;
        
        const toPrint = students.filter(s => selectedIds.has(s.student_id) && s.qr_token);
        if (toPrint.length === 0) {
            alert("Los alumnos seleccionados deben tener QR generado.");
            return;
        }

        try {
            setGenerating(true);
            const pdf = new jsPDF('p', 'mm', 'letter');
            let x = 10, y = 10;
            const cardW = 85.6, cardH = 54; // Standard CR80 card size
            
            for (let i = 0; i < toPrint.length; i++) {
                const s = toPrint[i];
                if (!s) continue;
                
                // Draw card outline
                pdf.setDrawColor(200);
                pdf.roundedRect(x, y, cardW, cardH, 3, 3, 'S');
                
                // Header (pretend colored band)
                pdf.setFillColor(15, 23, 42); // slate-900
                pdf.roundedRect(x, y, cardW, 12, 3, 3, 'F');
                pdf.setTextColor(255);
                pdf.setFontSize(10);
                pdf.text("CETMAR 42", x + 5, y + 8);
                
                // Student Info
                pdf.setTextColor(0);
                pdf.setFontSize(9);
                pdf.setFont("helvetica", "bold");
                const fullName = `${s.paterno} ${s.materno} ${s.name}`;
                // Wrap text if too long (cast cardW calculation to string if needed, but splitTextToSize expects (text: string, maxW: number))
                // Actually jsPDF splitTextToSize might have bad typings in some versions, but it's string, number.
                // Re-writing to avoid any typing quirks with the return type of jsPDF.
                const splitName = pdf.splitTextToSize(fullName, cardW - 35);
                // @ts-ignore
                pdf.text(splitName, x + 5, y + 20);
                
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(8);
                pdf.text(`No. Control: ${s.no_control}`, x + 5, y + 28);
                pdf.text(`Grupo: ${s.grupo}`, x + 5, y + 33);
                
                // Add QR Image to the right side of the card
                // We create a temporary canvas to render the QR code
                const qrVal = s.qr_token!;
                const canvas = document.createElement('canvas');
                // Use a library or the react-qr-code SVG to draw on canvas. 
                // For simplicity here, we'll just plot a placeholder rect in PDF 
                // In production, html2canvas over a hidden div with <QRCode> is better.
                pdf.setFillColor(240, 240, 240);
                pdf.rect(x + cardW - 30, y + 15, 25, 25, 'F');
                pdf.setTextColor(150);
                pdf.text("[QR CODE]", x + cardW - 28, y + 28);
                pdf.text(qrVal.substring(0,8) + '...', x + cardW - 28, y + 43);

                // Move coordinates for next card (3 columns, rows down)
                x += cardW + 5;
                if (x + cardW > 200) {
                    x = 10;
                    y += cardH + 5;
                }
                
                // Add page if needed
                if (y + cardH > 260 && i < toPrint.length - 1) {
                    pdf.addPage();
                    x = 10; y = 10;
                }
            }
            
            pdf.save("credenciales.pdf");
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setGenerating(false);
        }
    };

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanInput.trim()) return;

        try {
            const token = useAuthStore.getState().token;
            const payload = {
                qr_token: scanInput.trim(),
                scan_type: scanType
            };

            const res = await fetch("/api/credentials/scan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json() as { success: boolean; message?: string, error?: string, student?: any };
            
            if (data.success) {
                setScanResult({ success: true, message: data.message || "", student: data.student });
                // Reset form fast for next scan
                setTimeout(() => setScanResult(null), 3000);
            } else {
                setScanResult({ success: false, message: data.error || "Error al escanear" });
            }
        } catch (error) {
            console.error("Error scanning:", error);
            setScanResult({ success: false, message: "Error de conexión" });
        } finally {
            setScanInput("");
            if (scanInputRef.current) scanInputRef.current.focus();
        }
    };

    const filteredStudents = students.filter(s => {
        const fullName = `${s.paterno} ${s.materno} ${s.name}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase()) || 
               s.no_control.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
                        <IdCard className="w-7 h-7 mr-2 text-brand-600" />
                        Credenciales y Accesos
                    </h1>
                    <p className="text-gray-500 mt-1">Generación de QRs y registro de entradas/salidas</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setView("list")}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <IdCard className="w-4 h-4 mr-2" />
                        Credenciales
                    </button>
                    {(user?.role === "admin" || user?.role === "prefect") && (
                        <>
                        <button
                            onClick={() => setView("scan")}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                view === "scan" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            Escáner QR
                        </button>
                        <button
                            onClick={() => setView("logs")}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                view === "logs" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <Search className="w-4 h-4 mr-2" />
                            Bitácora
                        </button>
                        </>
                    )}
                </div>
            </div>

            {/* View: Credentials List */}
            {view === "list" && (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Buscar alumno..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {user?.role === "admin" && (
                                <button
                                    onClick={generateQRs}
                                    disabled={selectedIds.size === 0 || generating}
                                    className="flex items-center px-4 py-2 text-sm font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 disabled:opacity-50 transition-colors"
                                >
                                    <QrCode className="w-4 h-4 mr-2" />
                                    Generar QRs ({selectedIds.size})
                                </button>
                            )}
                            <button
                                onClick={printSelected}
                                disabled={selectedIds.size === 0 || generating}
                                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Imprimir PDF
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {loading ? (
                            <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 w-10">
                                                <input 
                                                    type="checkbox" 
                                                    onChange={handleSelectAll}
                                                    checked={selectedIds.size === filteredStudents.length && filteredStudents.length > 0}
                                                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                                />
                                            </th>
                                            <th className="px-6 py-3">Alumno</th>
                                            <th className="px-6 py-3">Grupo</th>
                                            <th className="px-6 py-3">Estado QR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredStudents.map((student) => (
                                            <tr key={student.student_id} className="hover:bg-gray-50">
                                                <td className="px-6 py-3">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedIds.has(student.student_id)}
                                                        onChange={() => handleSelect(student.student_id)}
                                                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                                    />
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="font-medium text-gray-900">{student.paterno} {student.materno} {student.name}</div>
                                                    <div className="text-xs text-gray-500">{student.no_control}</div>
                                                </td>
                                                <td className="px-6 py-3 text-gray-600 font-medium">{student.grupo}</td>
                                                <td className="px-6 py-3">
                                                    {student.qr_token ? (
                                                        <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                            Generado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-200">
                                                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                                            Pendiente
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View: Scanner Entry/Exit */}
            {view === "scan" && (
                <div className="max-w-xl mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-center">
                        <div className="flex justify-center mb-6">
                            <div className="inline-flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setScanType("entry")}
                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        scanType === "entry" ? "bg-green-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                                    }`}
                                >
                                    Fijar Entrada
                                </button>
                                <button
                                    onClick={() => setScanType("exit")}
                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        scanType === "exit" ? "bg-amber-500 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                                    }`}
                                >
                                    Fijar Salida
                                </button>
                            </div>
                        </div>

                        <div className="mb-6 relative">
                            {/* Visual representation of a scanner/reader */}
                            <div className="mx-auto w-48 h-48 border-4 border-dashed rounded-2xl flex flex-col items-center justify-center bg-gray-50 mb-4 transition-colors
                                ${scanType === 'entry' ? 'border-green-200' : 'border-amber-200'}">
                                <QrCode className={`w-16 h-16 ${scanType === 'entry' ? 'text-green-300' : 'text-amber-300'}`} />
                                <span className="text-sm font-medium text-gray-400 mt-2">Esperando escaneo...</span>
                            </div>

                            <form onSubmit={handleScan}>
                                <input
                                    ref={scanInputRef}
                                    type="text"
                                    value={scanInput}
                                    onChange={(e) => setScanInput(e.target.value)}
                                    placeholder="Click aquí y escanea el código QR"
                                    className="w-full text-center px-4 py-3 border-2 border-brand-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 mb-2 shadow-inner bg-brand-50/50"
                                    autoFocus
                                    autoComplete="off"
                                />
                                <button type="submit" className="sr-only">Escanear</button>
                                <p className="text-xs text-gray-400">El escáner de código de barras físico enviará un Enter automáticamente.</p>
                            </form>
                        </div>

                        {/* Result Display */}
                        {scanResult && (
                            <div className={`p-4 rounded-xl border ${scanResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} animate-in fade-in zoom-in duration-200`}>
                                <div className="flex items-center justify-center mb-2">
                                    {scanResult.success ? (
                                        <CheckCircle2 className="w-8 h-8 text-green-500 mr-2" />
                                    ) : (
                                        <XCircle className="w-8 h-8 text-red-500 mr-2" />
                                    )}
                                    <h3 className={`text-lg font-bold ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                        {scanResult.message}
                                    </h3>
                                </div>
                                {scanResult.student && (
                                    <div className="mt-3 text-left bg-white/60 p-3 rounded-lg border border-white/40">
                                        <p className="font-medium text-gray-900">{scanResult.student.name}</p>
                                        <p className="text-sm text-gray-600">{scanResult.student.no_control} • Grupo {scanResult.student.grupo}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* View: Logs */}
            {view === "logs" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h2 className="font-medium text-gray-900 flex items-center">
                            Bitácora de Entradas y Salidas de Hoy
                        </h2>
                        <button onClick={loadLogs} className="text-gray-500 hover:text-brand-600 transition-colors p-1" title="Actualizar">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                    {loading ? (
                        <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin" /></div>
                    ) : logs.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            No hay registros de accesos hoy
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3">Hora</th>
                                        <th className="px-6 py-3">Tipo</th>
                                        <th className="px-6 py-3">Alumno</th>
                                        <th className="px-6 py-3">Grupo</th>
                                        <th className="px-6 py-3">Escaneado por</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-900">
                                                {format(parseISO(log.timestamp), "HH:mm:ss")}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold
                                                    ${log.scan_type === 'entry' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {log.scan_type === 'entry' ? 'ENTRADA' : 'SALIDA'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="font-medium text-gray-900">{log.paterno} {log.materno} {log.student_name}</div>
                                                <div className="text-xs text-gray-500">{log.no_control}</div>
                                            </td>
                                            <td className="px-6 py-3 text-gray-600">{log.grupo}</td>
                                            <td className="px-6 py-3 text-xs text-gray-500">{log.scanned_by_name || 'Sistema'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
