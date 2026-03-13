import { format, parseISO } from "date-fns";
import { FileText, HeartPulse, Phone, ShieldAlert, Users } from "lucide-react";
import { StudentProfileChecklist } from "./StudentProfileChecklist";
import type { StudentProfileData } from "./types";

const documentLabels: Record<string, string> = {
    photo: "Fotografia",
    acta_nacimiento: "Acta de nacimiento",
    curp: "CURP",
    certificado_secundaria: "Certificado de secundaria",
    comprobante_domicilio: "Comprobante de domicilio",
    other: "Otro",
};

const incidentLabels: Record<string, string> = {
    amonestacion: "Amonestacion",
    suspension: "Suspension",
    nota: "Nota",
    warning: "Amonestacion",
    note: "Nota",
};

function formatDate(value?: string) {
    if (!value) return "Sin fecha";
    try {
        return format(parseISO(value), "dd/MM/yyyy");
    } catch {
        return value;
    }
}

export function StudentProfileSections({ profile }: { profile: StudentProfileData }) {
    return (
        <div className="space-y-4">
            <section className="card">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Users className="h-4 w-4 text-brand-600" />
                    Datos generales
                </h3>
                <div className="mt-4 grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                    <Info label="No. de control" value={profile.student.no_control} />
                    <Info label="CURP" value={profile.student.curp || "Sin capturar"} />
                    <Info label="Grupo" value={profile.student.grupo || "Sin grupo"} />
                    <Info label="Generacion" value={profile.student.generation || "Sin capturar"} />
                    <Info label="Carrera" value={profile.student.career || "Sin capturar"} />
                    <Info label="Semestre" value={String(profile.student.semester || 0)} />
                </div>
            </section>

            <section className="card">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <HeartPulse className="h-4 w-4 text-brand-600" />
                    Salud y contacto
                </h3>
                <div className="mt-4 grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                    <Info label="Tipo de sangre" value={profile.student.blood_type || "Sin capturar"} />
                    <Info label="NSS" value={profile.student.nss || "Sin capturar"} />
                    <Info label="Tutor principal" value={profile.guardians[0]?.name || "Sin tutor"} />
                    <Info label="Telefono principal" value={profile.guardians[0]?.phone || "Sin telefono"} />
                </div>
            </section>

            <section className="card">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Phone className="h-4 w-4 text-brand-600" />
                    Tutores
                </h3>
                <div className="mt-4 space-y-3">
                    {profile.guardians.length === 0 ? (
                        <p className="text-sm text-gray-500">No hay tutores registrados.</p>
                    ) : (
                        profile.guardians.map((guardian) => (
                            <div key={guardian.id} className="rounded-xl border border-gray-100 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{guardian.name}</p>
                                        <p className="text-xs text-gray-500">{guardian.relationship}</p>
                                    </div>
                                    <div className="text-right text-xs text-gray-500">
                                        <p>{guardian.phone}</p>
                                        <p>{guardian.email || "Sin correo"}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="card">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <FileText className="h-4 w-4 text-brand-600" />
                    Expediente digital
                </h3>
                <div className="mt-4 space-y-4">
                    <StudentProfileChecklist items={profile.document_checklist} />
                    <div className="space-y-2">
                        {profile.documents.length === 0 ? (
                            <p className="text-sm text-gray-500">No hay documentos cargados.</p>
                        ) : (
                            profile.documents.map((document) => (
                                <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {documentLabels[document.document_type] ?? document.document_type}
                                        </p>
                                        <p className="text-xs text-gray-500">{document.file_name}</p>
                                    </div>
                                    <div className="text-right text-xs text-gray-500">
                                        <p>{formatDate(document.uploaded_at)}</p>
                                        {document.is_primary && <p className="font-medium text-brand-700">Foto principal</p>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            <section className="card">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <ShieldAlert className="h-4 w-4 text-brand-600" />
                    Incidencias recientes
                </h3>
                <div className="mt-4 space-y-2">
                    {profile.recent_incidents.length === 0 ? (
                        <p className="text-sm text-gray-500">Sin incidencias recientes.</p>
                    ) : (
                        profile.recent_incidents.map((incident) => {
                            const type = incident.report_type ?? incident.type ?? "nota";
                            return (
                                <div key={incident.id} className="rounded-xl border border-gray-100 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-medium text-gray-900">
                                            {incidentLabels[type] ?? type}
                                        </p>
                                        <p className="text-xs text-gray-500">{formatDate(incident.date)}</p>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-700">{incident.description}</p>
                                    <p className="mt-1 text-xs text-gray-500">{incident.reported_by_name || "Sistema"}</p>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-2 text-sm font-medium text-gray-900">{value}</p>
        </div>
    );
}
